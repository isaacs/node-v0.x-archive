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


try {
  var constants = require('constants');
  var binding = process.binding('crypto');
  var SecureContext = binding.SecureContext;
  var Hmac = binding.Hmac;
  var Hash = binding.Hash;
  var Cipher = binding.Cipher;
  var Decipher = binding.Decipher;
  var Sign = binding.Sign;
  var Verify = binding.Verify;
  var DiffieHellman = binding.DiffieHellman;
  var PBKDF2 = binding.PBKDF2;
  var randomBytes = binding.randomBytes;
  var pseudoRandomBytes = binding.pseudoRandomBytes;
  var crypto = true;
} catch (e) {

  var crypto = false;
}


function secureFlags(flags) {
  if (~~flags) return flags; // user's custom settings override the defaults

  flags = 0;

  // SSLv2 is deprecated and quite insecure. We really should disable it...
  // flags |= (constants.SSL_OP_NO_SSLv2 || 0);

  // When performing renegotiation as a server, always start a new session
  // (i.e., session resumption requests are only accepted in the initial
  // handshake). This option is not needed for clients.
  flags |= (constants.SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION || 0);

  // When choosing a cipher, use the server's preferences instead of the client
  // preferences. When not set, the SSL server will always follow the clients
  // preferences. When set, the SSLv3/TLSv1 server will choose following its own
  // preferences. Because of the different protocol, for SSLv2 the server will
  // send its list of preferences to the client and the client chooses.
  flags |= (constants.SSL_OP_CIPHER_SERVER_PREFERENCE || 0);

  // Allow legacy insecure renegotiation between OpenSSL and unpatched servers
  // only.
  // XXX The bundled OpenSSL 0.9.8r sets SSL_OP_LEGACY_SERVER_CONNECT, which is
  // insecure, but clearing it breaks old clients. Rock, hard place...
  flags |= (constants.SSL_OP_LEGACY_SERVER_CONNECT || 0);

  return flags;
}


function Credentials(secureProtocol, flags, context) {
  if (!(this instanceof Credentials)) {
    return new Credentials(secureProtocol);
  }

  if (!crypto) {
    throw new Error('node.js not compiled with openssl crypto support.');
  }

  if (context) {
    this.context = context;
  } else {
    this.context = new SecureContext();

    if (secureProtocol) {
      this.context.init(secureProtocol);
    } else {
      this.context.init();
    }
  }

  flags = secureFlags(flags);
  if (flags) this.context.setOptions(flags);
}

exports.Credentials = Credentials;


exports.createCredentials = function(options, context) {
  if (!options) options = {};

  var c = new Credentials(options.secureProtocol,
                          options.secureOptions,
                          context);

  if (context) return c;

  if (options.key) {
    if (options.passphrase) {
      c.context.setKey(options.key, options.passphrase);
    } else {
      c.context.setKey(options.key);
    }
  }

  if (options.cert) c.context.setCert(options.cert);

  if (options.ciphers) c.context.setCiphers(options.ciphers);

  if (options.ca) {
    if (Array.isArray(options.ca)) {
      for (var i = 0, len = options.ca.length; i < len; i++) {
        c.context.addCACert(options.ca[i]);
      }
    } else {
      c.context.addCACert(options.ca);
    }
  } else {
    c.context.addRootCerts();
  }

  if (options.crl) {
    if (Array.isArray(options.crl)) {
      for (var i = 0, len = options.crl.length; i < len; i++) {
        c.context.addCRL(options.crl[i]);
      }
    } else {
      c.context.addCRL(options.crl);
    }
  }

  if (options.sessionIdContext) {
    c.context.setSessionIdContext(options.sessionIdContext);
  }

  return c;
};


exports.Hash = Hash;
exports.createHash = function(hash) {
  return new Hash(hash);
};


exports.Hmac = Hmac;
exports.createHmac = function(hmac, key) {
  return (new Hmac).init(hmac, key);
};


exports.Cipher = Cipher;
exports.createCipher = function(cipher, password) {
  return (new Cipher).init(cipher, password);
};


exports.createCipheriv = function(cipher, key, iv) {
  return (new Cipher).initiv(cipher, key, iv);
};


exports.Decipher = Decipher;
exports.createDecipher = function(cipher, password) {
  return (new Decipher).init(cipher, password);
};


exports.createDecipheriv = function(cipher, key, iv) {
  return (new Decipher).initiv(cipher, key, iv);
};


exports.Sign = Sign;
exports.createSign = function(algorithm) {
  return (new Sign).init(algorithm);
};

exports.Verify = Verify;
exports.createVerify = function(algorithm) {
  return (new Verify).init(algorithm);
};

exports.DiffieHellman = DiffieHellman;
exports.createDiffieHellman = function(size_or_key, enc) {
  if (!size_or_key) {
    return new DiffieHellman();
  } else if (!enc) {
    return new DiffieHellman(size_or_key);
  } else {
    return new DiffieHellman(size_or_key, enc);
  }

};

exports.pbkdf2 = PBKDF2;

exports.randomBytes = randomBytes;
exports.pseudoRandomBytes = pseudoRandomBytes;

exports.rng = randomBytes;
exports.prng = pseudoRandomBytes;
