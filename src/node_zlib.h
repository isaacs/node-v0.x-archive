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

#ifndef NODE_ZLIB
#define NODE_ZLIB

#include <v8.h>
#include <zlib.h>

namespace node {

using namespace v8;

static Persistent<String> ondata_sym;
static Persistent<String> onend_sym;
static Persistent<String> ondrain_sym;

#define DEFLATE 0
#define INFLATE 1

template <int mode> class Flate;

template <int mode> struct flate_req {
  Flate<mode>* self;
  size_t len;
  int flush;
  Bytef* buf;
  bool started;
  Persistent<Value> callback;
};

template <int mode> struct flate_req_q {
  flate_req<mode> *req;
  flate_req_q<mode> *next;
};


void InitZlib(v8::Handle<v8::Object> target);

}

#endif  // NODE_ZLIB
