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
#define CHUNK 65536

namespace node {

using namespace v8;

static Persistent<String> ondata_sym;
static Persistent<String> onend_sym;

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


class Deflate : public ObjectWrap {

 public:

  Deflate(int level) : ObjectWrap() {
    Init(level);
  }

  ~Deflate() {
  }

  static Handle<Value> Write(const Arguments& args) {
    size_t buffer_length;
    Bytef * buf;
    if (args.Length() < 1) {
      // just a flush or end call
      buf = (Bytef *)"\0";
      buffer_length = 0;
    } else {
      if (!Buffer::HasInstance(args[0])) {
        return ThrowException(Exception::Error(
                    String::New("First argument needs to be a buffer")));
      }

      Local<Object> buffer_obj = args[0]->ToObject();
      buf = (Bytef *)Buffer::Data(buffer_obj);
      buffer_length = Buffer::Length(buffer_obj);
    }

    Deflate *self = ObjectWrap::Unwrap<Deflate>(args.This());

    self->strm.avail_in = buffer_length;
    self->strm.next_in = buf;

    do {
      self->strm.avail_out = CHUNK;
      self->strm.next_out = self->out;

      // XXX Do this in a thread.
      // Also, buffer up pending writes, and return false if
      // there are more in the queue.
      self->err = deflate(&(self->strm), self->flush);    /* no bad return value */
      assert(self->err != Z_STREAM_ERROR);  /* state not clobbered */

      self->have = CHUNK - self->strm.avail_out;
      Buffer* deflated = Buffer::New((char *)(self->out), self->have);
      if (self->handle_->Has(ondata_sym)) {
        Handle<Value> od = self->handle_->Get(ondata_sym);
        assert(od->IsFunction());
        Handle<Function> ondata = Handle<Function>::Cast(od);
        Handle<Value> odargv[1] = { deflated->handle_ };
        ondata->Call(self->handle_, 1, odargv);
      }

    } while (self->strm.avail_out == 0);

    assert(self->strm.avail_in == 0);     /* all input will be used */

    return True();
  }

  static Handle<Value> End(const Arguments& args) {
    Deflate *self = ObjectWrap::Unwrap<Deflate>(args.This());

    self->flush = Z_FINISH;
    if ( args.Length() >= 1 ) {
      self->Write(args);
    }
    if (self->handle_->Has(onend_sym)) {
      Handle<Value> oe = self->handle_->Get(onend_sym);
      assert(oe->IsFunction());
      Handle<Function> onend = Handle<Function>::Cast(oe);
      onend->Call(self->handle_, 0, NULL);
    }
    return True();
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
      return ThrowException(Exception::Error(
            String::New(zlib_perr(self->err))));
    }

    self->Wrap(args.This());

    return args.This();
  }


 private:

  int err;
  int level;
  z_stream strm;
  int flush;

  unsigned char out[CHUNK];
  unsigned have;

  void Init (int level_) {
    level = level_;
    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;
    err = deflateInit(&strm, level);
    flush = Z_NO_FLUSH;
    if (err != Z_OK) {
      return;
    }
  }
};


void InitZlib(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(Deflate::New);

  // zstrm struct
  t->InstanceTemplate()->SetInternalFieldCount(4);

  NODE_SET_PROTOTYPE_METHOD(t, "write", Deflate::Write);
  NODE_SET_PROTOTYPE_METHOD(t, "end", Deflate::End);

  t->SetClassName(String::NewSymbol("Deflate"));

  target->Set(String::NewSymbol("Deflate"), t->GetFunction());

  ondata_sym = NODE_PSYMBOL("onData");
  onend_sym = NODE_PSYMBOL("onEnd");
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
