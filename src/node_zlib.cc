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
static Persistent<String> callback_sym;

enum node_zlib_mode {
  DEFLATE = 1,
  INFLATE,
  GZIP,
  GUNZIP,
  DEFLATERAW,
  INFLATERAW
};

template <node_zlib_mode mode> class ZCtx;


void InitZlib(v8::Handle<v8::Object> target);



/**
 * Deflate/Inflate
 */
template <node_zlib_mode mode> class ZCtx : public ObjectWrap {

 public:

  ZCtx() : ObjectWrap() {
  }

  ~ZCtx() {
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      (void)deflateEnd(&strm_);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      (void)inflateEnd(&strm_);
    }
    free(out_);
  }

  // write(chunk, flush, cb)
  static Handle<Value>
  Write(const Arguments& args) {
    if (args.Length() != 2) {
      assert(0 && "usage: write(chunk, flush)");
    }

    Bytef* buf;
    size_t len;

    if (args[0]->IsNull()) {
      buf = (Bytef *)"\0";
      len = 0;
    } else if (Buffer::HasInstance(args[0])) {
      Local<Object> buffer_obj;
      buffer_obj = args[0]->ToObject();
      buf = (Bytef *)Buffer::Data(buffer_obj);
      len = Buffer::Length(buffer_obj);
    } else {
      assert(0 && "First arg must be a buffer or null");
    }

    unsigned int flush = args[1]->Uint32Value();

    ZCtx<mode> *ctx = ObjectWrap::Unwrap< ZCtx<mode> >(args.This());
    assert(ctx->init_done_ && "init not done");

    WorkReqWrap *req_wrap = new WorkReqWrap();

    req_wrap->data_ = ctx;
    ctx->strm_.avail_in = len;
    ctx->strm_.next_in = buf;
    ctx->flush_ = flush;

    // build up the work request
    uv_work_t* work_req = new uv_work_t();
    work_req->data = req_wrap;

    uv_queue_work(uv_default_loop(),
                  work_req,
                  ZCtx<mode>::Process,
                  ZCtx<mode>::After);

    req_wrap->Dispatched();

    return req_wrap->object_;
  }


  // thread pool!
  // This function may be called multiple times on the uv_work pool
  // for a single write() call, until all of the input bytes have
  // been consumed.
  static void
  Process(uv_work_t* work_req) {
    WorkReqWrap *req_wrap = (WorkReqWrap *)work_req->data;
    ZCtx<mode> *ctx = (ZCtx<mode> *)req_wrap->data_;

    ctx->strm_.avail_out = ctx->chunk_size_;
    ctx->strm_.next_out = ctx->out_;

    // If the avail_out is left at 0, then it means that it ran out
    // of room.  If there was avail_out left over, then it means
    // that all of the input was consumed.
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      ctx->err_ = deflate(&(ctx->strm_), ctx->flush_);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      ctx->err_ = inflate(&(ctx->strm_), ctx->flush_);
    }

    assert(ctx->err_ != Z_STREAM_ERROR);

    // now After will emit the output, and
    // either schedule another call to Process,
    // or shift the queue and call Process.
  }

  // v8 land!
  static void
  After(uv_work_t* work_req) {
    WorkReqWrap *req_wrap = (WorkReqWrap *)work_req->data;
    ZCtx<mode> *ctx = (ZCtx<mode> *)req_wrap->data_;

    int have = ctx->chunk_size_ - ctx->strm_.avail_out;

    if (have > 0) {
      // got some output
      Buffer* flated = Buffer::New((char *)(ctx->out_), have);
      if (ctx->handle_->Has(ondata_sym)) {
        Handle<Value> od = ctx->handle_->Get(ondata_sym);
        assert(od->IsFunction());
        Handle<Function> ondata = Handle<Function>::Cast(od);
        Handle<Value> odargv[1] = { flated->handle_ };
        ondata->Call(ctx->handle_, 1, odargv);
      }
    }

    // if there's no avail_out, then it means that it wasn't able to
    // fully consume the input.  Reschedule another call to Process.
    if (ctx->strm_.avail_out == 0) {
      uv_queue_work(uv_default_loop(),
                    work_req,
                    ZCtx<mode>::Process,
                    ZCtx<mode>::After);
      return;
    }

    // call the write() cb
    assert(req_wrap->object_->Get(callback_sym)->IsFunction() &&
           "Invalid callback");
    Local<Function> callback =
      Local<Function>::Cast(req_wrap->object_->Get(callback_sym));
    callback->Call(ctx->handle_, 0, NULL);

    // delete the ReqWrap
    delete req_wrap;
  }

  static Handle<Value>
  New(const Arguments& args) {
    HandleScope scope;
    ZCtx<mode> *ctx = new ZCtx<mode>();
    ctx->Wrap(args.This());
    return args.This();
  }

  // just pull the ints out of the args and call the other Init
  static Handle<Value>
  Init(const Arguments& args) {
    HandleScope scope;

    assert(args.Length() == 5 &&
           "init(chunkSize, level, windowBits, memLevel, strategy)");

    ZCtx<mode> *ctx = ObjectWrap::Unwrap< ZCtx<mode> >(args.This());

    int chunk_size = args[0]->Uint32Value();

    int windowBits = args[1]->Uint32Value();
    assert((windowBits >= 8 && windowBits <= 15) && "invalid windowBits");

    int level = args[2]->Uint32Value();
    assert((level >= -1 && level <= 9) && "invalid compression level");

    int memLevel = args[3]->Uint32Value();
    assert((memLevel >= 1 && memLevel <= 9) && "invalid memlevel");

    int strategy = args[4]->Uint32Value();
    assert((strategy == Z_FILTERED ||
            strategy == Z_HUFFMAN_ONLY ||
            strategy == Z_RLE ||
            strategy == Z_FIXED ||
            strategy == Z_DEFAULT_STRATEGY) && "invalid strategy");

    Init(ctx, chunk_size, level, windowBits, memLevel, strategy);
    return Undefined();
  }

  static void
  Init (ZCtx *ctx,
        int chunk_size,
        int level,
        int windowBits,
        int memLevel,
        int strategy) {
    ctx->chunk_size_ = chunk_size;
    ctx->level_ = level;
    ctx->windowBits_ = windowBits;
    ctx->memLevel_ = memLevel;
    ctx->strategy_ = strategy;

    ctx->out_ = (Bytef *)malloc(ctx->chunk_size_);
    assert(ctx->out_ && "Couldn't malloc output buffer");

    ctx->strm_.zalloc = Z_NULL;
    ctx->strm_.zfree = Z_NULL;
    ctx->strm_.opaque = Z_NULL;

    ctx->flush_ = Z_NO_FLUSH;

    if (mode == GZIP || mode == GUNZIP) {
      ctx->windowBits_ += 16;
    }

    if (mode == DEFLATERAW || mode == INFLATERAW) {
      ctx->windowBits_ *= -1;
    }

    int err;
    if (mode == DEFLATE || mode == GZIP || mode == DEFLATERAW) {
      err = deflateInit2(&(ctx->strm_),
                         ctx->level_,
                         Z_DEFLATED,
                         ctx->windowBits_,
                         ctx->memLevel_,
                         ctx->strategy_);
    } else if (mode == INFLATE || mode == GUNZIP || mode == INFLATERAW) {
      err = inflateInit2(&(ctx->strm_), ctx->windowBits_);
    }

    ctx->init_done_ = true;
    assert(err == Z_OK);
  }

 private:

  bool init_done_;

  int err_;
  z_stream strm_;
  int level_;
  int windowBits_;
  int memLevel_;
  int strategy_;

  int flush_;

  Bytef *out_;
  int chunk_size_;
};


#define NODE_ZLIB_CLASS(mode, name)   \
  { \
    Local<FunctionTemplate> z = FunctionTemplate::New(ZCtx<mode>::New); \
    z->InstanceTemplate()->SetInternalFieldCount(1); \
    NODE_SET_PROTOTYPE_METHOD(z, "write", ZCtx<mode>::Write); \
    NODE_SET_PROTOTYPE_METHOD(z, "init", ZCtx<mode>::Init); \
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
  callback_sym = NODE_PSYMBOL("callback");

  NODE_DEFINE_CONSTANT(target, Z_NO_FLUSH);
  NODE_DEFINE_CONSTANT(target, Z_PARTIAL_FLUSH);
  NODE_DEFINE_CONSTANT(target, Z_SYNC_FLUSH);
  NODE_DEFINE_CONSTANT(target, Z_FULL_FLUSH);
  NODE_DEFINE_CONSTANT(target, Z_FINISH);
  NODE_DEFINE_CONSTANT(target, Z_BLOCK);
  NODE_DEFINE_CONSTANT(target, Z_OK);
  NODE_DEFINE_CONSTANT(target, Z_STREAM_END);
  NODE_DEFINE_CONSTANT(target, Z_NEED_DICT);
  NODE_DEFINE_CONSTANT(target, Z_ERRNO);
  NODE_DEFINE_CONSTANT(target, Z_STREAM_ERROR);
  NODE_DEFINE_CONSTANT(target, Z_DATA_ERROR);
  NODE_DEFINE_CONSTANT(target, Z_MEM_ERROR);
  NODE_DEFINE_CONSTANT(target, Z_BUF_ERROR);
  NODE_DEFINE_CONSTANT(target, Z_VERSION_ERROR);
  NODE_DEFINE_CONSTANT(target, Z_NO_COMPRESSION);
  NODE_DEFINE_CONSTANT(target, Z_BEST_SPEED);
  NODE_DEFINE_CONSTANT(target, Z_BEST_COMPRESSION);
  NODE_DEFINE_CONSTANT(target, Z_DEFAULT_COMPRESSION);
  NODE_DEFINE_CONSTANT(target, Z_FILTERED);
  NODE_DEFINE_CONSTANT(target, Z_HUFFMAN_ONLY);
  NODE_DEFINE_CONSTANT(target, Z_RLE);
  NODE_DEFINE_CONSTANT(target, Z_FIXED);
  NODE_DEFINE_CONSTANT(target, Z_DEFAULT_STRATEGY);
  NODE_DEFINE_CONSTANT(target, ZLIB_VERNUM);

  target->Set(String::NewSymbol("ZLIB_VERSION"), String::New(ZLIB_VERSION));
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
