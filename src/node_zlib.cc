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



class Zlib : public ObjectWrap {

 public:

  Zlib() : ObjectWrap() {
    Init();
  }

  ~Zlib() {
  }

  static Handle<Value> New(const Arguments& args) {
    HandleScope scope;

    Zlib *self;
    self->Wrap(args.This());

    return args.This();
  }

 private:

  void Init () {
  }

  z_stream strm;
};


void InitZlib(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(Zlib::New);

  // zstrm struct
  t->InstanceTemplate()->SetInternalFieldCount(1);

  t->SetClassName(String::NewSymbol("Zlib"));

  target->Set(String::NewSymbol("Zlib"), t->GetFunction());
}

}  // namespace node

NODE_MODULE(node_zlib, node::InitZlib);
