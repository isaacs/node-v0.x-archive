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


#include "node.h"
#include "node_buffer.h"
#include "req_wrap.h"

#include <v8.h>

#include <errno.h>
#include <string.h>
#include <stdlib.h>

#include <sys/types.h>
#include <unistd.h>
#include <zlib.h>


#define DEFAULT_CHUNK (1024 * 16)


namespace node {

using namespace v8;

// write() returns one of these, and then calls the cb() when it's done.
typedef ReqWrap<uv_work_t> WorkReqWrap;

static Persistent<String> ondata_sym;
static Persistent<String> buffer_sym;
static Persistent<String> callback_sym;

enum node_zlib_mode {
  DEFLATE = 1,
  INFLATE,
  GZIP,
  GUNZIP,
  DEFLATERAW,
  INFLATERAW
};

template <node_zlib_mode mode> class Zlib;


void InitZlib(v8::Handle<v8::Object> target);

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
template <node_zlib_mode mode> class Zlib : public ObjectWrap {

 public:

  Zlib(int chunk_size,
        int level,
        int windowBits,
        int memLevel,
        int strategy) : ObjectWrap() {
    Init(chunk_size, level, windowBits, memLevel, strategy);
  }

  ~Zlib() {
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      (void)deflateEnd(&strm);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      (void)inflateEnd(&strm);
    }
    free(out);
  }

  // write(chunk, flush, cb)
  static Handle<Value> Write(const Arguments& args) {

    if (args.Length() != 3) {
        return ThrowException(Exception::Error(
                    String::New("usage: write(chunk, flush, cb)")));
    }

    Bytef* buf;
    size_t len;
    Local<Object> buffer_obj;
    Local<Function> callback;

    if (args[0]->IsNull()) {
      buf = (Bytef *)"\0";
      len = 0;
    } else if (Buffer::HasInstance(args[0])) {
      buffer_obj = args[0]->ToObject();
      buf = (Bytef *)Buffer::Data(buffer_obj);
      len = Buffer::Length(buffer_obj);
    } else {
      return ThrowException(Exception::Error(
                  String::New("First arg must be a buffer or null")));
    }

    unsigned int flush = args[1]->Uint32Value();

    if (!args[2]->IsFunction()) {
      return ThrowException(Exception::Error(
                  String::New("Last argument must be a function")));
    }

    callback = Local<Function>::Cast(args[2]);

    Zlib<mode> *self = ObjectWrap::Unwrap< Zlib<mode> >(args.This());

    WorkReqWrap *req_wrap = new WorkReqWrap();
    if (!buffer_obj.IsEmpty()) {
      req_wrap->object_->Set(buffer_sym, buffer_obj);
    }
    req_wrap->object_->Set(callback_sym, callback);
    req_wrap->data_ = self;

    z_stream *strm = &(self->strm);
    strm->avail_in = len;
    strm->next_in = buf;
    self->flush = flush;

    // build up the work request
    uv_work_t* work_req = new uv_work_t();
    work_req->data = req_wrap;

    uv_queue_work(uv_default_loop(),
                  work_req,
                  Zlib<mode>::Process,
                  Zlib<mode>::After);

    req_wrap->Dispatched();

    return req_wrap->object_;
  }


  // thread pool!
  // This function may be called multiple times on the uv_work pool
  // for a single write() call, until all of the input bytes have
  // been consumed.
  static void Process(uv_work_t* work_req) {
    WorkReqWrap *req_wrap = (WorkReqWrap *)work_req->data;
    Zlib<mode> *self = (Zlib<mode> *)req_wrap->data_;
    z_stream *strm = &(self->strm);

    strm->avail_out = self->chunk_size;
    strm->next_out = self->out;

    // If the avail_out is left at 0, then it means that it ran out
    // of room.  If there was avail_out left over, then it means
    // that all of the input was consumed.
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      self->err = deflate(strm, self->flush);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      self->err = inflate(strm, self->flush);
    }

    assert(self->err != Z_STREAM_ERROR);

    // now After will emit the output, and
    // either schedule another call to Process,
    // or shift the queue and call Process.
  }

  // v8 land!
  static void After(uv_work_t* work_req) {
    WorkReqWrap *req_wrap = (WorkReqWrap *)work_req->data;
    Zlib<mode> *self = (Zlib<mode> *)req_wrap->data_;
    z_stream *strm = &(self->strm);

    int have = self->chunk_size - strm->avail_out;

    // Handle<Value> n = self->handle_
    //                       ->ToObject()->Get(String::New("prototype"))
    //                       ->ToObject()->Get(String::New("constructor"))
    //                       ->ToObject()->Get(String::New("name"));
    // String::Utf8Value name(n->ToString());

    if (have > 0) {
      // got some output
      Buffer* flated = Buffer::New((char *)(self->out), have);
      if (self->handle_->Has(ondata_sym)) {
        Handle<Value> od = self->handle_->Get(ondata_sym);
        assert(od->IsFunction());
        Handle<Function> ondata = Handle<Function>::Cast(od);
        Handle<Value> odargv[1] = { flated->handle_ };
        ondata->Call(self->handle_, 1, odargv);
      }
      // necessary?
      // memset(self->out, '\0', have);
    }

    // if there's no avail_out, then it means that it wasn't able to
    // fully consume the input.  Reschedule another call to Process.
    if (strm->avail_out == 0) {
      uv_queue_work(uv_default_loop(),
                    work_req,
                    Zlib<mode>::Process,
                    Zlib<mode>::After);
      return;
    }

    // call the write() cb
    Local<Function> callback =
      Local<Function>::Cast(req_wrap->object_->Get(callback_sym));
    callback->Call(self->handle_, 0, NULL);

    // delete the ReqWrap
    delete req_wrap;
  }

  static Handle<Value> New(const Arguments& args) {
    HandleScope scope;

    Zlib<mode> *self;

    int chunk_size_ = args[0]->Uint32Value();
    if (chunk_size_ == 0) {
      chunk_size_ = DEFAULT_CHUNK;
    }

    int level_ = args[1]->Int32Value();
    if (level_ < -1 || level_ > 9) {
      return ThrowException(Exception::Error(
            String::New("Invalid compression level, must be -1 to 9")));
    }

    int windowBits_ = args[2]->Int32Value();
    if (windowBits_ < 8 || windowBits_ > 15) {
      return ThrowException(Exception::Error(
            String::New("Invalid windowBits, must be 8 to 15")));
    }

    // memLevel and strategy only make sense for compression.
    int memLevel_ = 8;
    int strategy_ = Z_DEFAULT_STRATEGY;
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      if (args.Length() > 3) {
        memLevel_ = args[3]->Int32Value();
        if (memLevel_ < 1 || memLevel_ > 9) {
          return ThrowException(Exception::Error(
                String::New("Invalid memory level, must be 1 to 9")));
        }

        if (args.Length() > 4) {
          strategy_ = args[4]->Int32Value();
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




    self = new Zlib<mode>(chunk_size_,
                          level_,
                          windowBits_,
                          memLevel_,
                          strategy_);
    if (self->err != Z_OK) {
      const char *msg = self->strm.msg;
      if (msg == NULL) msg = zlib_perr(self->err);
      return ThrowException(Exception::Error(String::New(msg)));
    }

    self->Wrap(args.This());

    return args.This();
  }


 private:

  int err;
  z_stream strm;
  int level;
  int windowBits;
  int memLevel;
  int strategy;

  int flush;

  Bytef *out;
  int chunk_size;

  void Init (int chunk_size_,
             int level_,
             int windowBits_,
             int memLevel_,
             int strategy_) {
    chunk_size = chunk_size_;
    level = level_;
    windowBits = windowBits_;
    memLevel = memLevel_;
    strategy = strategy_;

    out = (Bytef *)malloc(chunk_size);
    // necessary?
    // memset(out, '\0', chunk_size);

    strm.zalloc = Z_NULL;
    strm.zfree = Z_NULL;
    strm.opaque = Z_NULL;

    flush = Z_NO_FLUSH;

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


#define NODE_ZLIB_CLASS(mode, name)   \
  { \
    Local<FunctionTemplate> z = FunctionTemplate::New(Zlib<mode>::New); \
    z->InstanceTemplate()->SetInternalFieldCount(1); \
    NODE_SET_PROTOTYPE_METHOD(z, "write", Zlib<mode>::Write); \
    z->SetClassName(String::NewSymbol(name)); \
    target->Set(String::NewSymbol(name), z->GetFunction()); \
  }

void InitZlib(Handle<Object> target) {
  HandleScope scope;

  NODE_ZLIB_CLASS(INFLATE, "Inflate")
  NODE_ZLIB_CLASS(DEFLATE, "Deflate")
  NODE_ZLIB_CLASS(INFLATERAW, "InflateRaw")
  NODE_ZLIB_CLASS(DEFLATERAW, "DeflateRaw")
  NODE_ZLIB_CLASS(GZIP, "Gzip")
  NODE_ZLIB_CLASS(GUNZIP, "Gunzip")

  ondata_sym = NODE_PSYMBOL("onData");
  buffer_sym = NODE_PSYMBOL("buffer");
  callback_sym = NODE_PSYMBOL("callback");
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
