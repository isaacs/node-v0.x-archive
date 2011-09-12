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
 * Deflate/Inflate
 */
template <int mode> class Flate : public ObjectWrap {

 public:

  Flate(int level,
        int windowBits,
        int memLevel,
        int strategy) : ObjectWrap() {
    Init(level, windowBits, memLevel, strategy);
  }

  ~Flate() {
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

    Flate<mode> *self = ObjectWrap::Unwrap< Flate<mode> >(args.This());

    if (self->ended) {
      return ThrowException(Exception::Error(
                  String::New("Cannot write after end()")));
    }

    // create the flate_req
    flate_req<mode> *req = new flate_req<mode>;
    req->self = self;
    req->callback = callback;
    req->len = len;
    req->buf = buf;
    // set to Z_NO_FLUSH normally, or Z_FINISH when called as .end()
    req->flush = self->flush;
    // might be set true in UVProcess
    req->started = false;

    // add to the queue
    flate_req_q<mode> *t = self->req_tail;
    flate_req_q<mode> *h = self->req_head;
    flate_req_q<mode> *q = new flate_req_q<mode>();
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

    Flate<mode> *self = req_head->req->self;
    z_stream *strm = &(self->strm);
    strm->avail_in = req_head->req->len;
    strm->next_in = req_head->req->buf;

    //fprintf(stderr, "heading to thread queue %d\n", strm->avail_in);
    //fprintf(stderr, "heading to thread queue %d\n", strm->avail_in);
    uv_queue_work(uv_default_loop(),
                  work_req,
                  Flate<mode>::UVProcess,
                  Flate<mode>::UVProcessAfter);
    return;
  }

  // thread pool!
  // This function may be called multiple times on the uv_work pool
  // until all of the input bytes have been exhausted.
  static void UVProcess(uv_work_t* work_req) {
    //fprintf(stderr, "UVProcess\n");
    flate_req<mode> *req = (flate_req<mode> *)work_req->data;

    Flate<mode> *self = req->self;
    z_stream *strm = &(self->strm);

    strm->avail_out = CHUNK;
    strm->next_out = self->out;

    // If the avail_out is left at 0, then it means that it ran out
    // of room.  If there was avail_out left over, then it means
    // that all of the input was consumed.
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      self->err = deflate(strm, req->flush);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      //fprintf(stderr, "UVProcess pre-inflate\n");
      self->err = inflate(strm, req->flush);
      //fprintf(stderr, "UVProcess post-inflate\n");
    }

    assert(self->err != Z_STREAM_ERROR);
    self->have = CHUNK - strm->avail_out;

    // now UVProcessAfter will emit the output, and
    // either schedule another call to UVProcess,
    // or shift the queue and call Process.
  }

  // v8 land!
  static void UVProcessAfter(uv_work_t* work_req) {
    flate_req<mode> *req = (flate_req<mode> *)work_req->data;

    Flate<mode> *self = req->self;
    if (self->have > 0) {
      Buffer* flated = Buffer::New((char *)(self->out), self->have);
      if (self->handle_->Has(ondata_sym)) {
        Handle<Value> od = self->handle_->Get(ondata_sym);
        assert(od->IsFunction());
        Handle<Function> ondata = Handle<Function>::Cast(od);
        Handle<Value> odargv[1] = { flated->handle_ };
        ondata->Call(self->handle_, 1, odargv);
      }
    }

    // if there's no avail_out, then it means that it wasn't able to
    // fully consume the input.  Reschedule another call to UVProcess.
    z_stream *strm = &(self->strm);
    if (strm->avail_out == 0) {
      //fprintf(stderr, "More work for this one: %d\n", strm->avail_out);
      //fprintf(stderr, "  avail_in=%d\n", strm->avail_in);
      //fprintf(stderr, "  next_in=%s\n", strm->next_in);
      uv_queue_work(uv_default_loop(),
                    work_req,
                    Flate<mode>::UVProcess,
                    Flate<mode>::UVProcessAfter);
      return;
    }

    // no longer processing this request.
    self->processing = false;

    // shift the queue
    flate_req_q<mode> *h = self->req_head;
    if (h != NULL) {
      flate_req_q<mode> *t = self->req_tail;
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
      //fprintf(stderr, "something on queue: q_len=%d\n", self->req_q_len);
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
      // assert(self->err == Z_STREAM_END);
      //fprintf(stderr, "ending status=%d\n", self->err);
      z_stream *strm = &(self->strm);
      if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
        (void)deflateEnd(strm);
      } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
        (void)inflateEnd(strm);
      }
    }
  }

  static Handle<Value> End(const Arguments& args) {
    HandleScope scope;

    Handle<Value> ret;
    Flate<mode> *self = ObjectWrap::Unwrap< Flate<mode> >(args.This());

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

    Flate<mode> *self;

    int level_ = args[0]->Int32Value();
    if (level_ < -1 || level_ > 9) {
      return ThrowException(Exception::Error(
            String::New("Invalid compression level, must be -1 to 9")));
    }

    int windowBits_ = args[1]->Int32Value();
    if (windowBits_ < 8 || windowBits_ > 15) {
      return ThrowException(Exception::Error(
            String::New("Invalid windowBits, must be 8 to 15")));
    }

    // memLevel and strategy only make sense for compression.
    int memLevel_ = 8;
    int strategy_ = Z_DEFAULT_STRATEGY;
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      if (args.Length() > 2) {
        memLevel_ = args[2]->Int32Value();
        if (memLevel_ < 1 || memLevel_ > 9) {
          return ThrowException(Exception::Error(
                String::New("Invalid memory level, must be 1 to 9")));
        }

        if (args.Length() > 3) {
          strategy_ = args[3]->Int32Value();
          switch (strategy_) {
            case Z_DEFAULT_STRATEGY:
            case Z_FILTERED:
            case Z_HUFFMAN_ONLY:
            case Z_RLE:
              break;
            default:
              return ThrowException(Exception::Error(
                    String::New("Invalid compression strategy")));
          }
        }
      }
    }




    self = new Flate<mode>(level_, windowBits_, memLevel_, strategy_);
    if (self->err != Z_OK) {
      const char *msg = self->strm.msg;
      if (msg == NULL) msg = zlib_perr(self->err);
      return ThrowException(Exception::Error(String::New(msg)));
    }

    self->Wrap(args.This());

    return args.This();
  }


 private:

  flate_req_q<mode> *req_head;
  flate_req_q<mode> *req_tail;
  int req_q_len;
  bool processing;

  int err;
  z_stream strm;
  int level;
  int windowBits;
  int memLevel;
  int strategy;

  int flush;
  bool ended;
  bool need_drain;

  unsigned char out[CHUNK];
  unsigned have;

  void Init (int level_,
             int windowBits_,
             int memLevel_,
             int strategy_) {
    level = level_;
    windowBits = windowBits_;
    memLevel = memLevel_;
    strategy = strategy_;

    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;

    flush = Z_NO_FLUSH;
    processing = false;
    ended = false;
    need_drain = false;
    req_head = NULL;
    req_tail = NULL;
    req_q_len = 0;

    if (mode == GZIP || mode == GUNZIP) {
      windowBits += 16;
    }

    if (mode == DEFLATERAW || mode == INFLATERAW) {
      windowBits *= -1;
    }

    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      err = deflateInit2(&strm,
                         level,
                         Z_DEFLATED,
                         windowBits,
                         memLevel,
                         strategy);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      err = inflateInit2(&strm, windowBits);
    }

    assert(err == Z_OK);
  }
};


void InitZlib(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> inf = FunctionTemplate::New(Flate<INFLATE>::New);
  inf->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(inf, "write", Flate<INFLATE>::Write);
  NODE_SET_PROTOTYPE_METHOD(inf, "end", Flate<INFLATE>::End);
  inf->SetClassName(String::NewSymbol("Inflate"));
  target->Set(String::NewSymbol("Inflate"), inf->GetFunction());

  Local<FunctionTemplate> def = FunctionTemplate::New(Flate<DEFLATE>::New);
  def->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(def, "write", Flate<DEFLATE>::Write);
  NODE_SET_PROTOTYPE_METHOD(def, "end", Flate<DEFLATE>::End);
  def->SetClassName(String::NewSymbol("Deflate"));
  target->Set(String::NewSymbol("Deflate"), def->GetFunction());

  Local<FunctionTemplate> infr = FunctionTemplate::New(Flate<INFLATERAW>::New);
  infr->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(infr, "write", Flate<INFLATERAW>::Write);
  NODE_SET_PROTOTYPE_METHOD(infr, "end", Flate<INFLATERAW>::End);
  infr->SetClassName(String::NewSymbol("InflateRaw"));
  target->Set(String::NewSymbol("InflateRaw"), infr->GetFunction());

  Local<FunctionTemplate> defr = FunctionTemplate::New(Flate<DEFLATERAW>::New);
  defr->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(defr, "write", Flate<DEFLATERAW>::Write);
  NODE_SET_PROTOTYPE_METHOD(defr, "end", Flate<DEFLATERAW>::End);
  defr->SetClassName(String::NewSymbol("DeflateRaw"));
  target->Set(String::NewSymbol("DeflateRaw"), defr->GetFunction());

  Local<FunctionTemplate> gz = FunctionTemplate::New(Flate<GZIP>::New);
  gz->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(gz, "write", Flate<GZIP>::Write);
  NODE_SET_PROTOTYPE_METHOD(gz, "end", Flate<GZIP>::End);
  gz->SetClassName(String::NewSymbol("Gzip"));
  target->Set(String::NewSymbol("Gzip"), gz->GetFunction());

  Local<FunctionTemplate> gun = FunctionTemplate::New(Flate<GUNZIP>::New);
  gun->InstanceTemplate()->SetInternalFieldCount(1);
  NODE_SET_PROTOTYPE_METHOD(gun, "write", Flate<GUNZIP>::Write);
  NODE_SET_PROTOTYPE_METHOD(gun, "end", Flate<GUNZIP>::End);
  gun->SetClassName(String::NewSymbol("Gunzip"));
  target->Set(String::NewSymbol("Gunzip"), gun->GetFunction());

  ondata_sym = NODE_PSYMBOL("onData");
  onend_sym = NODE_PSYMBOL("onEnd");
  ondrain_sym = NODE_PSYMBOL("onDrain");
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
