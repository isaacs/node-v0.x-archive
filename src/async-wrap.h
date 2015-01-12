#ifndef SRC_ASYNC_WRAP_H_
#define SRC_ASYNC_WRAP_H_

#include "base-object.h"
#include "env.h"
#include "v8.h"

namespace node {

class AsyncWrap : public BaseObject {
 public:
  enum AsyncFlags {
    NO_OPTIONS = 0,
    HAS_ASYNC_LISTENER = 1
  };

  enum ProviderType {
    PROVIDER_NONE               = 1 << 0,
    PROVIDER_CARES              = 1 << 1,
    PROVIDER_CONNECTWRAP        = 1 << 2,
    PROVIDER_CRYPTO             = 1 << 3,
    PROVIDER_FSEVENTWRAP        = 1 << 4,
    PROVIDER_GETADDRINFOREQWRAP = 1 << 5,
    PROVIDER_PIPEWRAP           = 1 << 6,
    PROVIDER_PROCESSWRAP        = 1 << 7,
    PROVIDER_REQWRAP            = 1 << 8,
    PROVIDER_SHUTDOWNWRAP       = 1 << 9,
    PROVIDER_SIGNALWRAP         = 1 << 10,
    PROVIDER_STATWATCHER        = 1 << 11,
    PROVIDER_TCPWRAP            = 1 << 12,
    PROVIDER_TIMERWRAP          = 1 << 13,
    PROVIDER_TLSWRAP            = 1 << 14,
    PROVIDER_TTYWRAP            = 1 << 15,
    PROVIDER_UDPWRAP            = 1 << 16,
    PROVIDER_ZLIB               = 1 << 17,
    PROVIDER_GETNAMEINFOREQWRAP = 1 << 18
  };

  inline AsyncWrap(Environment* env,
                   v8::Handle<v8::Object> object,
                   ProviderType provider);

  inline virtual ~AsyncWrap() override = default;

  inline bool has_async_listener();

  inline uint32_t provider_type() const;

  // Only call these within a valid HandleScope.
  inline v8::Handle<v8::Value> MakeCallback(const v8::Handle<v8::Function> cb,
                                            int argc,
                                            v8::Handle<v8::Value>* argv);
  inline v8::Handle<v8::Value> MakeCallback(const v8::Handle<v8::String> symbol,
                                            int argc,
                                            v8::Handle<v8::Value>* argv);
  inline v8::Handle<v8::Value> MakeCallback(uint32_t index,
                                            int argc,
                                            v8::Handle<v8::Value>* argv);

 private:
  inline AsyncWrap();

  // TODO(trevnorris): BURN IN FIRE! Remove this as soon as a suitable
  // replacement is committed.
  inline v8::Handle<v8::Value> MakeDomainCallback(
      const v8::Handle<v8::Function> cb,
      int argc,
      v8::Handle<v8::Value>* argv);

  uint32_t async_flags_;
  uint32_t provider_type_;
};

}  // namespace node


#endif  // SRC_ASYNC_WRAP_H_
