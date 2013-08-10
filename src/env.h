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

#ifndef SRC_ENV_H_
#define SRC_ENV_H_

#include "ares.h"
#include "tree.h"
#include "util.h"
#include "uv.h"
#include "v8.h"

// Caveat emptor: we're going slightly crazy with macros here but the end
// hopefully justifies the means. We have a lot of per-context properties
// and adding and maintaining their getters and setters by hand would be
// a nightmare so let's make the preprocessor generate them for us.
//
// Make sure that any macros defined here are undefined again at the bottom
// of context-inl.h. The sole exception is NODE_CONTEXT_EMBEDDER_DATA_INDEX,
// it may have been defined externally.
namespace node {

// Pick an index that's hopefully out of the way when we're embedded inside
// another application. Performance-wise or memory-wise it doesn't matter:
// Context::SetAlignedPointerInEmbedderData() is backed by a FixedArray,
// worst case we pay a one-time penalty for resizing the array.
#ifndef NODE_CONTEXT_EMBEDDER_DATA_INDEX
#define NODE_CONTEXT_EMBEDDER_DATA_INDEX 32
#endif

// Strings are per-isolate primitives but Environment proxies them
// for the sake of convenience.
//
// kPreload initializes properties at Environment creation time. Use it
// for properties that are performance-sensitive or will always be used.
#define PER_ISOLATE_STRING_PROPERTIES(V)                                      \
  V(DELETE_string, "DELETE", kPreload)                                        \
  V(GET_string, "GET", kPreload)                                              \
  V(HEAD_string, "HEAD", kPreload)                                            \
  V(POST_string, "POST", kPreload)                                            \
  V(PUT_string, "PUT", kPreload)                                              \
  V(address_string, "address", kNone)                                         \
  V(atime_string, "atime", kPreload)                                          \
  V(birthtime_string, "birthtime", kPreload)                                  \
  V(blksize_string, "blksize", kPreload)                                      \
  V(blocks_string, "blocks", kPreload)                                        \
  V(buffer_string, "buffer", kPreload)                                        \
  V(bytes_string, "bytes", kPreload)                                          \
  V(callback_string, "callback", kNone)                                       \
  V(change_string, "change", kNone)                                           \
  V(close_string, "close", kPreload)                                          \
  V(code_string, "code", kNone)                                               \
  V(ctime_string, "ctime", kPreload)                                          \
  V(dev_string, "dev", kPreload)                                              \
  V(disposed_string, "_disposed", kNone)                                      \
  V(domain_string, "domain", kPreload)                                        \
  V(enter_string, "enter", kPreload)                                          \
  V(errno_string, "errno", kNone)                                             \
  V(exit_string, "exit", kPreload)                                            \
  V(exponent_string, "exponent", kNone)                                       \
  V(exports_string, "exports", kNone)                                         \
  V(ext_key_usage_string, "ext_key_usage", kNone)                             \
  V(family_string, "family", kNone)                                           \
  V(fatal_exception_string, "_fatalException", kPreload)                      \
  V(fingerprint_string, "fingerprint", kNone)                                 \
  V(gid_string, "gid", kPreload)                                              \
  V(handle_string, "handle", kPreload)                                        \
  V(headers_string, "headers", kPreload)                                      \
  V(heap_total_string, "heapTotal", kNone)                                    \
  V(heap_used_string, "heapUsed", kNone)                                      \
  V(immediate_callback_string, "_immediateCallback", kPreload)                \
  V(ino_string, "ino", kPreload)                                              \
  V(ipv4_string, "IPv4", kNone)                                               \
  V(ipv6_string, "IPv6", kNone)                                               \
  V(issuer_string, "issuer", kNone)                                           \
  V(method_string, "method", kPreload)                                        \
  V(mode_string, "mode", kPreload)                                            \
  V(modulus_string, "modulus", kNone)                                         \
  V(mtime_string, "mtime", kPreload)                                          \
  V(name_string, "name", kNone)                                               \
  V(nlink_string, "nlink", kPreload)                                          \
  V(onchange_string, "onchange", kNone)                                       \
  V(onclienthello_string, "onclienthello", kNone)                             \
  V(oncomplete_string, "oncomplete", kPreload)                                \
  V(onconnection_string, "onconnection", kPreload)                            \
  V(onerror_string, "onerror", kNone)                                         \
  V(onexit_string, "onexit", kNone)                                           \
  V(onhandshakedone_string, "onhandshakedone", kNone)                         \
  V(onhandshakestart_string, "onhandshakestart", kNone)                       \
  V(onmessage_string, "onmessage", kNone)                                     \
  V(onnewsession_string, "onnewsession", kNone)                               \
  V(onread_string, "onread", kPreload)                                        \
  V(onsignal_string, "onsignal", kNone)                                       \
  V(onstop_string, "onstop", kNone)                                           \
  V(path_string, "path", kNone)                                               \
  V(port_string, "port", kNone)                                               \
  V(rdev_string, "rdev", kPreload)                                            \
  V(rename_string, "rename", kNone)                                           \
  V(rss_string, "rss", kNone)                                                 \
  V(servername_string, "servername", kNone)                                   \
  V(session_id_string, "sessionId", kNone)                                    \
  V(should_keep_alive_string, "shouldKeepAlive", kPreload)                    \
  V(size_string, "size", kPreload)                                            \
  V(smalloc_p_string, "_smalloc_p", kPreload)                                 \
  V(sni_context_string, "sni_context", kNone)                                 \
  V(status_code_string, "statusCode", kPreload)                               \
  V(subject_string, "subject", kNone)                                         \
  V(subjectaltname_string, "subjectaltname", kNone)                           \
  V(syscall_string, "syscall", kNone)                                         \
  V(tls_ticket_string, "tlsTicket", kNone)                                    \
  V(uid_string, "uid", kPreload)                                              \
  V(upgrade_string, "upgrade", kPreload)                                      \
  V(url_string, "url", kPreload)                                              \
  V(valid_from_string, "valid_from", kNone)                                   \
  V(valid_to_string, "valid_to", kNone)                                       \
  V(version_major_string, "versionMajor", kPreload)                           \
  V(version_minor_string, "versionMinor", kPreload)                           \
  V(version_string, "version", kNone)                                         \
  V(write_queue_size_string, "writeQueueSize", kNone)                         \

#define ENVIRONMENT_STRONG_PERSISTENT_PROPERTIES(V)                           \
  V(binding_cache_object, v8::Object)                                         \
  V(buffer_constructor_function, v8::Function)                                \
  V(context, v8::Context)                                                     \
  V(domain_array, v8::Array)                                                  \
  V(module_load_list_array, v8::Array)                                        \
  V(pipe_constructor_template, v8::FunctionTemplate)                          \
  V(process_object, v8::Object)                                               \
  V(script_context_constructor_template, v8::FunctionTemplate)                \
  V(script_data_constructor_function, v8::Function)                           \
  V(secure_context_constructor_template, v8::FunctionTemplate)                \
  V(stats_constructor_function, v8::Function)                                 \
  V(tcp_constructor_template, v8::FunctionTemplate)                           \
  V(tick_callback_function, v8::Function)                                     \
  V(tls_wrap_constructor_function, v8::Function)                              \
  V(tty_constructor_template, v8::FunctionTemplate)                           \
  V(udp_constructor_function, v8::Function)                                   \

class Environment;

// TODO(bnoordhuis) Rename struct, the ares_ prefix implies it's part
// of the c-ares API while the _t suffix implies it's a typedef.
struct ares_task_t {
  Environment* env;
  ares_socket_t sock;
  uv_poll_t poll_watcher;
  RB_ENTRY(ares_task_t) node;
};

RB_HEAD(ares_task_list, ares_task_t);

class Environment {
 public:
  class DomainFlag {
   public:
    inline uint32_t* fields();
    inline int fields_count() const;
    inline uint32_t count() const;

   private:
    friend class Environment;  // So we can call the constructor.
    inline DomainFlag();

    enum Fields {
      kCount,
      kFieldsCount
    };

    uint32_t fields_[kFieldsCount];

    DISALLOW_COPY_AND_ASSIGN(DomainFlag);
  };

  class TickInfo {
   public:
    inline uint32_t* fields();
    inline int fields_count() const;
    inline uint32_t in_tick() const;
    inline uint32_t index() const;
    inline uint32_t last_threw() const;
    inline uint32_t length() const;
    inline void set_index(uint32_t value);
    inline void set_last_threw(uint32_t value);

   private:
    friend class Environment;  // So we can call the constructor.
    inline TickInfo();

    enum Fields {
      kInTick,
      kIndex,
      kLastThrew,
      kLength,
      kFieldsCount
    };

    uint32_t fields_[kFieldsCount];

    DISALLOW_COPY_AND_ASSIGN(TickInfo);
  };

  static inline Environment* GetCurrent(v8::Isolate* isolate);
  static inline Environment* GetCurrent(v8::Local<v8::Context> context);

  // See CreateEnvironment() in src/node.cc.
  static inline Environment* New(v8::Local<v8::Context> context);
  inline void Dispose();

  // We implement context() and isolate() manually because we always want
  // to return a non-const value.
  inline v8::Isolate* isolate() const;
  inline bool in_domain() const;

  static inline Environment* from_immediate_check_handle(uv_check_t* handle);
  inline uv_check_t* immediate_check_handle();
  inline uv_idle_t* immediate_idle_handle();
  inline uv_loop_t* event_loop();
  inline DomainFlag* domain_flag();
  inline TickInfo* tick_info();

  static inline Environment* from_cares_timer_handle(uv_timer_t* handle);
  inline uv_timer_t* cares_timer_handle();
  inline ares_channel cares_channel();
  inline ares_channel* cares_channel_ptr();
  inline ares_task_list* cares_task_list();

  inline bool using_smalloc_alloc_cb() const;
  inline void set_using_smalloc_alloc_cb(bool value);

  inline bool using_domains() const;
  inline void set_using_domains(bool value);

  // Strings are shared across shared contexts. The getters simply proxy to
  // the per-isolate object.
#define V(PropertyName, StringValue, Flags)                                   \
  inline v8::Local<v8::String> PropertyName() const;
  PER_ISOLATE_STRING_PROPERTIES(V)
#undef V

#define V(PropertyName, TypeName)                                             \
  inline v8::Local<TypeName> PropertyName() const;                            \
  inline void set_ ## PropertyName(v8::Local<TypeName> value);
  ENVIRONMENT_STRONG_PERSISTENT_PROPERTIES(V)
#undef V

  // Generate const getter.
 private:
  class IsolateData;
  inline explicit Environment(v8::Local<v8::Context> context);
  inline ~Environment();
  inline IsolateData* isolate_data() const;

  enum ContextEmbedderDataIndex {
    kContextEmbedderDataIndex = NODE_CONTEXT_EMBEDDER_DATA_INDEX
  };

  v8::Isolate* const isolate_;
  IsolateData* const isolate_data_;
  uv_check_t immediate_check_handle_;
  uv_idle_t immediate_idle_handle_;
  DomainFlag domain_flag_;
  TickInfo tick_info_;
  uv_timer_t cares_timer_handle_;
  ares_channel cares_channel_;
  ares_task_list cares_task_list_;
  bool using_smalloc_alloc_cb_;
  bool using_domains_;

#define V(PropertyName, TypeName)                                             \
  v8::Persistent<TypeName> PropertyName ## _;
  ENVIRONMENT_STRONG_PERSISTENT_PROPERTIES(V)
#undef V

  // Per-thread, reference-counted singleton.
  class IsolateData {
   public:
    static inline IsolateData* GetOrCreate(v8::Isolate* isolate);
    inline void Release();
    inline uv_loop_t* event_loop() const;

#define V(PropertyName, StringValue, Flags)                                   \
    inline v8::Local<v8::String> PropertyName();
    PER_ISOLATE_STRING_PROPERTIES(V)
#undef V

   private:
    inline explicit IsolateData(v8::Isolate* isolate);
    inline ~IsolateData();
    inline v8::Isolate* isolate() const;

    enum PropertyFlags {
      kNone = 0,
      kPreload = 1,   // Run initializer when Environment object is created.
    };

    uv_loop_t* event_loop_;
    v8::Isolate* isolate_;
    unsigned int ref_count_;

#define V(PropertyName, StringValue, Flags)                                   \
    int PropertyName ## _index_;
    PER_ISOLATE_STRING_PROPERTIES(V)
#undef V

    DISALLOW_COPY_AND_ASSIGN(IsolateData);
  };

  DISALLOW_COPY_AND_ASSIGN(Environment);
};

}  // namespace node

#endif  // SRC_ENV_H_
