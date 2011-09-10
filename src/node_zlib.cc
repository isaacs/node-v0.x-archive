// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


#include <node.h>
#include <node_buffer.h>
#include <node_zlib.h>

#include <v8.h>

#include <errno.h>
#include <string.h>
#include <stdlib.h>

#include <sys/types.h>
#include <unistd.h>
#include <zlib.h>


//XXX Make this configurable.
#define CHUNK (1024 * 16)

namespace node {

using namespace v8;

static Persistent<String> ondata_sym;
static Persistent<String> onend_sym;
static Persistent<String> ondrain_sym;

const char * zlib_perr(int code)
{
  switch (code) {
    case Z_ERRNO        : return "Z_ERRNO";
    case Z_STREAM_ERROR : return "Z_STREAM_ERROR";
    case Z_DATA_ERROR   : return "Z_DATA_ERROR";
    case Z_MEM_ERROR    : return "Z_MEM_ERROR";
    case Z_BUF_ERROR    : return "Z_BUF_ERROR";
    case Z_VERSION_ERROR: return "Z_VERSION_ERROR";
    default             : return "Unknown Error";
  }
}




/**
 * Deflate
 */

class Deflate : public ObjectWrap {

 public:

  Deflate(int level) : ObjectWrap() {
    Init(level);
  }

  ~Deflate() {
  }

  static Handle<Value> Write(const Arguments& args) {
    // last arg may be a callback.
    // any other arg must be a buffer.

    int argLen = args.Length();
    Persistent<Value> callback;
    size_t len;
    Bytef* buf;
    if (argLen > 0 && args[argLen - 1]->IsFunction()) {
      argLen --;
      callback = Persistent<Value>::New(args[argLen - 1]);
    } else {
      callback = Persistent<Value>::New(Undefined());
    }

    if (argLen < 1) {
      // just a flush or end call
      buf = (Bytef *)"\0";
      len = 0;
    } else {
      if (!Buffer::HasInstance(args[0])) {
        return ThrowException(Exception::Error(
                    String::New("First argument needs to be a buffer")));
      }

      Local<Object> buffer_obj = args[0]->ToObject();
      buf = (Bytef *)Buffer::Data(buffer_obj);
      len = Buffer::Length(buffer_obj);
    }

    Deflate *self = ObjectWrap::Unwrap<Deflate>(args.This());

    if (self->ended) {
      return ThrowException(Exception::Error(
                  String::New("Cannot write after end()")));
    }

    // create the deflate_req
    deflate_req *req = new deflate_req;
    req->self = self;
    req->callback = callback;
    req->len = len;
    req->buf = buf;
    // set to Z_NO_FLUSH normally, or Z_FINISH when called as .end()
    req->flush = self->flush;
    // might be set true in UVProcess
    req->started = false;

    // add to the queue
    deflate_req_q *t = self->req_tail;
    deflate_req_q *h = self->req_head;
    deflate_req_q *q = new deflate_req_q();
    q->req = req;
    q->next = NULL;
    if (!self->req_head || !self->req_tail) {
      self->req_head = h = self->req_tail = t = q;
    } else {
      t->next = q;
      t = self->req_tail = q;
    }

    bool ret = self->req_q_len == 0;
    self->need_drain = !ret;
    self->req_q_len ++;

    // if it's already processing, then this is a noop
    self->Process();

    // backpressure.
    return Boolean::New(ret);
  }


  void Process() {
    if (processing || req_head == NULL) return;

    // we're now processing a write
    processing = true;

    // set up the uv_work_t request
    uv_work_t* work_req = new uv_work_t();
    work_req->data = req_head->req;

    Deflate *self = req_head->req->self;
    z_stream strm = self->strm;
    strm.avail_in = req_head->req->len;
    strm.next_in = req_head->req->buf;

    uv_queue_work(uv_default_loop(),
                  work_req,
                  Deflate::UVProcess,
                  Deflate::UVProcessAfter);
    return;
  }

  // thread pool!
  // This function may be called multiple times on the uv_work pool
  // until all of the input bytes have been exhausted.
  static void UVProcess(uv_work_t* work_req) {
    deflate_req *req = (deflate_req *)work_req->data;

    Deflate *self = req->self;
    z_stream strm = self->strm;

    strm.avail_out = CHUNK;
    strm.next_out = self->out;

    // If the avail_out is left at 0, then it means that it ran out
    // of room.  If there was avail_out left over, then it means
    // that all of the input was consumed.
    self->err = deflate(&strm, self->flush);
    assert(self->err != Z_STREAM_ERROR);
    self->have = CHUNK - strm.avail_out;

    // now UVProcessAfter will emit the output, and
    // either schedule another call to UVProcess,
    // or shift the queue and call Process.
  }

  // v8 land!
  static void UVProcessAfter(uv_work_t* work_req) {
    deflate_req *req = (deflate_req *)work_req->data;

    Deflate *self = req->self;
    if (self->have > 0) {
      Buffer* deflated = Buffer::New((char *)(self->out), self->have);
      if (self->handle_->Has(ondata_sym)) {
        Handle<Value> od = self->handle_->Get(ondata_sym);
        assert(od->IsFunction());
        Handle<Function> ondata = Handle<Function>::Cast(od);
        Handle<Value> odargv[1] = { deflated->handle_ };
        ondata->Call(self->handle_, 1, odargv);
      }
    }

    // if there's no avail_out, then it means that it wasn't able to
    // fully consume the input.  Reschedule another call to UVProcess.
    z_stream strm = self->strm;
    if (strm.avail_out == 0) {
      uv_queue_work(uv_default_loop(),
                    work_req,
                    Deflate::UVProcess,
                    Deflate::UVProcessAfter);
      return;
    }

    // no longer processing this request.
    self->processing = false;

    // shift the queue
    deflate_req_q *h = self->req_head;
    if (h != NULL) {
      deflate_req_q *t = self->req_tail;
      self->req_head = self->req_head->next;
      if (t == h) {
        t = NULL;
      }
      free(h);
      self->req_q_len --;
    } else {
      self->req_q_len = 0;
    }

    // df.write("data", cb)
    if (req->callback->IsFunction()) {
      Handle<Function> callback = Handle<Function>::Cast(req->callback);
      callback->Call(self->handle_, 0, NULL);
    }

    // If there's anything on the queue, then keep processing.
    // Otherwise, emit a "drain" event if there was a buffered write.
    if (self->req_q_len > 0) {
      // keep processing.
      self->Process();
      return;
    }

    // check if we need a drain event, and have a listener.
    if (self->need_drain) {
      self->need_drain = false;
      if (self->handle_->Has(ondrain_sym)) {
        Handle<Value> od = self->handle_->Get(ondrain_sym);
        assert(od->IsFunction());
        Handle<Function> ondrain = Handle<Function>::Cast(od);
        ondrain->Call(self->handle_, 0, NULL);
      }
    }

    // if we ended, then no more data is coming, and no more processing
    // needs to be done.  clean up the zstream
    if (self->ended) {
      z_stream strm = self->strm;
      (void)deflateEnd(&strm);
    }
  }

  static Handle<Value> End(const Arguments& args) {
    HandleScope scope;

    Handle<Value> ret;
    Deflate *self = ObjectWrap::Unwrap<Deflate>(args.This());

    // flush the remaining bytes.
    self->flush = Z_FINISH;
    if ( args.Length() >= 1 ) {
      ret = self->Write(args);
    }

    self->ended = true;
    return ret;
  }

  static Handle<Value> New(const Arguments& args) {
    HandleScope scope;

    Deflate *self;

    int level_ = args[0]->Int32Value();
    if (level_ < -1 || level_ > 9) {
      return ThrowException(Exception::Error(
            String::New("Invalid compression level")));
    }

    self = new Deflate(level_);
    if (self->err != Z_OK) {
      const char *msg = self->strm.msg;
      if (msg == NULL) msg = zlib_perr(self->err);
      return ThrowException(Exception::Error(String::New(msg)));
    }

    self->Wrap(args.This());

    return args.This();
  }


 private:

  deflate_req_q *req_head;
  deflate_req_q *req_tail;
  int req_q_len;
  bool processing;

  int err;
  int level;
  z_stream strm;
  int flush;
  bool ended;
  bool need_drain;

  unsigned char out[CHUNK];
  unsigned have;

  void Init (int level_) {
    level = level_;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;
    err = deflateInit(&strm, level);
    flush = Z_NO_FLUSH;
    processing = false;
    ended = false;
    need_drain = false;
    req_head = NULL;
    req_tail = NULL;
    req_q_len = 0;
    if (err != Z_OK) {
      return;
    }
  }
};


void InitZlib(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(Deflate::New);

  t->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(t, "write", Deflate::Write);
  NODE_SET_PROTOTYPE_METHOD(t, "end", Deflate::End);

  t->SetClassName(String::NewSymbol("Deflate"));

  target->Set(String::NewSymbol("Deflate"), t->GetFunction());

  ondata_sym = NODE_PSYMBOL("onData");
  onend_sym = NODE_PSYMBOL("onEnd");
  ondrain_sym = NODE_PSYMBOL("onDrain");
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
