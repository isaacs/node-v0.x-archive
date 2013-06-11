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

#ifndef STREAM_WRAP_H_
#define STREAM_WRAP_H_

#include "v8.h"
#include "node.h"
#include "handle_wrap.h"
#include "req_wrap.h"
#include "string_bytes.h"

namespace node {

// Forward declaration
class StreamWrap;

typedef class ReqWrap<uv_shutdown_t> ShutdownWrap;

class WriteWrap: public ReqWrap<uv_write_t> {
 public:
  explicit WriteWrap(StreamWrap* wrap) {
    wrap_ = wrap;
  }

  void* operator new(size_t size, char* storage) { return storage; }

  // This is just to keep the compiler happy. It should never be called, since
  // we don't use exceptions in node.
  void operator delete(void* ptr, char* storage) { assert(0); }

  StreamWrap* wrap_;

 protected:
  // People should not be using the non-placement new and delete operator on a
  // WriteWrap. Ensure this never happens.
  void* operator new(size_t size) { assert(0); };
  void operator delete(void* ptr) { assert(0); };
};

// Overridable callbacks' types
class StreamWrapCallbacks {
 public:
  explicit StreamWrapCallbacks(StreamWrap* wrap) : wrap_(wrap) {
  }

  explicit StreamWrapCallbacks(StreamWrapCallbacks* old) : wrap_(old->wrap_) {
  }

  virtual ~StreamWrapCallbacks() {
  }

  virtual int DoWrite(WriteWrap* w,
                      uv_buf_t* bufs,
                      int count,
                      uv_stream_t* send_handle,
                      uv_write_cb cb);
  virtual void AfterWrite(WriteWrap* w);
  virtual uv_buf_t DoAlloc(uv_handle_t* handle, size_t suggested_size);
  virtual void DoRead(uv_stream_t* handle,
                      ssize_t nread,
                      uv_buf_t buf,
                      uv_handle_type pending);
  virtual int DoShutdown(ShutdownWrap* req_wrap, uv_shutdown_cb cb);

  v8::Handle<v8::Object> Self();

 protected:
  StreamWrap* wrap_;
};

class StreamWrap : public HandleWrap {
 public:
  uv_stream_t* GetStream() { return stream_; }

  void OverrideCallbacks(StreamWrapCallbacks* callbacks) {
    StreamWrapCallbacks* old = callbacks_;
    callbacks_ = callbacks;
    if (old != &default_callbacks_)
      delete old;
  }

  StreamWrapCallbacks* GetCallbacks() {
    return callbacks_;
  }

  static void Initialize(v8::Handle<v8::Object> target);

  static v8::Handle<v8::Value> GetFD(v8::Local<v8::String>,
                                     const v8::AccessorInfo&);

  // JavaScript functions
  static v8::Handle<v8::Value> ReadStart(const v8::Arguments& args);
  static v8::Handle<v8::Value> ReadStop(const v8::Arguments& args);
  static v8::Handle<v8::Value> Shutdown(const v8::Arguments& args);

  static v8::Handle<v8::Value> Writev(const v8::Arguments& args);
  static v8::Handle<v8::Value> WriteBuffer(const v8::Arguments& args);
  static v8::Handle<v8::Value> WriteAsciiString(const v8::Arguments& args);
  static v8::Handle<v8::Value> WriteUtf8String(const v8::Arguments& args);
  static v8::Handle<v8::Value> WriteUcs2String(const v8::Arguments& args);

  // Overridable callbacks
  StreamWrapCallbacks* callbacks_;

 protected:
  static size_t WriteBuffer(v8::Handle<v8::Value> val, uv_buf_t* buf);

  StreamWrap(v8::Handle<v8::Object> object, uv_stream_t* stream);
  ~StreamWrap() {
    if (callbacks_ != &default_callbacks_) {
      delete callbacks_;
      callbacks_ = NULL;
    }
  }
  void StateChange() { }
  void UpdateWriteQueueSize();

 private:
  static inline char* NewSlab(v8::Handle<v8::Object> global, v8::Handle<v8::Object> wrap_obj);

  // Callbacks for libuv
  static void AfterWrite(uv_write_t* req, int status);
  static uv_buf_t OnAlloc(uv_handle_t* handle, size_t suggested_size);
  static void AfterShutdown(uv_shutdown_t* req, int status);

  static void OnRead(uv_stream_t* handle, ssize_t nread, uv_buf_t buf);
  static void OnRead2(uv_pipe_t* handle, ssize_t nread, uv_buf_t buf,
      uv_handle_type pending);
  static void OnReadCommon(uv_stream_t* handle, ssize_t nread,
      uv_buf_t buf, uv_handle_type pending);

  template <enum encoding encoding>
  static v8::Handle<v8::Value> WriteStringImpl(const v8::Arguments& args);

  size_t slab_offset_;
  uv_stream_t* stream_;

  StreamWrapCallbacks default_callbacks_;
  friend class StreamWrapCallbacks;
};


}  // namespace node


#endif  // STREAM_WRAP_H_
