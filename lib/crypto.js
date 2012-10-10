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
  var binding = process.binding('crypto');
  var SecureContext = binding.SecureContext;
  var DiffieHellman = binding.DiffieHellman;
  var DiffieHellmanGroup = binding.DiffieHellmanGroup;
  var PBKDF2 = binding.PBKDF2;
  var randomBytes = binding.randomBytes;
  var pseudoRandomBytes = binding.pseudoRandomBytes;
  var crypto = true;
} catch (e) {
  var crypto = false;
}

var util = require('util');
var Transform = require('_stream_transform');

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

  if (options.pfx) {
    if (options.passphrase) {
      c.context.loadPKCS12(options.pfx, options.passphrase);
    } else {
      c.context.loadPKCS12(options.pfx);
    }
  }

  return c;
};


// Base class for Hmac and Hash
util.inherits(Digest, Transform);

function Digest(options) {
  Transform.call(this, options);
  this._writableState.decodeStrings = false;
}

Digest.prototype._transform = function(chunk, output, cb) {
  var enc = chunk[1];
  chunk = chunk[0];
  if (!Buffer.isBuffer(chunk) && !enc)
    enc = 'utf8';
  this.update(chunk, enc);
  cb();
};

Digest.prototype._flush = function(output, cb) {
  var enc = this._readableState.encoding || 'buffer';
  output(this.digest(enc));
  cb();
};


// legacy, non-stream api.
Digest.prototype.update = function(chunk, encoding) {
  encoding = encoding || 'buffer';
  return this._binding.update(chunk, encoding);
};

Digest.prototype.digest = function(encoding) {
  encoding = encoding || this._readableState.encoding || 'buffer';
  return this._binding.digest(encoding);
};


exports.Hash = Hash;
util.inherits(Hash, Digest);

function Hash(hash, options) {
  if (!(this instanceof Hash))
    return new Hash(hash, options);

  this._binding = new binding.Hash(hash);
  Digest.call(this, options);
}

exports.createHash = function(hash, options) {
  return new Hash(hash, options);
};


exports.Hmac = Hmac;
util.inherits(Hmac, Digest);

function Hmac(hmac, key, options) {
  if (!(this instanceof Hmac))
    return new Hmac(hmac, key, options);

  this._binding = new binding.Hmac();
  this.init(hmac, key);
  Digest.call(this, options);
}

Hmac.prototype.init = function(hmac, key) {
  this._binding.init(hmac, key);
  return this;
};

exports.createHmac = function(hmac, key) {
  return new Hmac(hmac, key);
};



util.inherits(CipherStream, Transform);
function CipherStream(options) {
  Transform.call(this, options);
  this._writableState.decodeStrings = false;
}

CipherStream.prototype._transform = function(chunk, output, cb) {
  var inEnc = chunk[1] || 'buffer';
  chunk = chunk[0];
  var outEnc = this._readableState.encoding || 'buffer';
  var ret = this.update(chunk, inEnc, outEnc);
  if (ret && ret.length)
    output(ret);
  cb();
};

CipherStream.prototype._flush = function(output, cb) {
  var encoding = this._readableState.encoding || 'buffer';
  var final = this.final(encoding);
  if (final && final.length)
    output(final);
  cb();
};

CipherStream.prototype.update = function(data, inenc, outenc) {
  return this._binding.update(data, inenc, outenc);
};

CipherStream.prototype.final = function(outenc) {
  return this._binding.final(outenc);
};

CipherStream.prototype.init = function(cipher, password) {
  this._binding.init(cipher, password);
  return this;
};

CipherStream.prototype.initiv = function(cipher, key, iv) {
  this._binding.initiv(cipher, key, iv);
  return this;
};


util.inherits(Cipher, CipherStream);

function Cipher(cipher, password, options) {
  if (!(this instanceof Cipher))
    return new Cipher(cipher, password, options);

  this._binding = new binding.Cipher();
  this._binding.init(cipher, password);
  CipherStream.call(this, options);
}

Cipher.prototype.setAutoPadding = function(ap) {
  return this._binding.setAutoPadding(ap);
};

exports.Cipher = Cipher;
exports.createCipher = function(cipher, password, options) {
  return new Cipher(cipher, password, options);
};


exports.Decipher = Decipher;
exports.createDecipher = function(cipher, password, options) {
  return new Decipher(cipher, password, options);
};

util.inherits(Decipher, CipherStream);
function Decipher(cipher, password, options) {
  if (!(this instanceof Decipher))
    return new Decipher(cipher, password, options);

  this._binding = new binding.Decipher();
  this._binding.init(cipher, password);
  CipherStream.call(this, options);
}

Decipher.prototype.setAutoPadding = Cipher.prototype.setAutoPadding;


exports.Cipheriv = Cipheriv;
util.inherits(Cipheriv, CipherStream);

exports.createCipheriv = function(cipher, key, iv, options) {
  return new Cipheriv(cipher, key, iv, options);
};

function Cipheriv(cipher, key, iv, options) {
  if (!(this instanceof Cipheriv))
    return new Cipheriv(cipher, key, iv, options);

  this._binding = new binding.Cipher;
  this._binding.initiv(cipher, key, iv);
  CipherStream.call(this, options);
}


exports.Decipheriv = Decipheriv;
exports.createDecipheriv = function(cipher, key, iv, options) {
  return new Decipheriv(cipher, key, iv, options);
};

util.inherits(Decipheriv, CipherStream);

function Decipheriv(cipher, key, iv, options) {
  if (!(this instanceof Decipheriv))
    return new Decipheriv(cipher, key, iv, options);

  this._binding = new binding.Decipher;
  this._binding.initiv(cipher, key, iv);
  CipherStream.call(this, options);
}



exports.Sign = Sign;
exports.createSign = function(algorithm, key, options) {
  return new Sign(algorithm, key, options);
};

util.inherits(Sign, Transform);

function Sign(algorithm, key, options) {
  if (!(this instanceof Sign))
    return new Sign(algorithm, key, options);

  if (typeof key === 'object') {
    options = key;
    key = options.key;
  }
  this.key = key;
  this._binding = new binding.Sign;
  this._binding.init(algorithm);
  Transform.call(this, options);
  this._writableState.decodeStrings = false;
}

Sign.prototype._transform = function(chunk, output, cb) {
  var enc = chunk[1] || 'buffer';
  chunk = chunk[0];
  this._binding.update(chunk);
  cb();
};

Sign.prototype._flush = function(output, cb) {
  var ret = this._binding.sign(this.key, 'buffer');
  if (ret && ret.length)
    output(ret);
  cb();
};

// legacy
Sign.prototype.update = function(chunk) {
  return this._binding.update(chunk);
};

Sign.prototype.sign = function(key, encoding) {
  return this._binding.sign(key, encoding);
};



exports.Verify = Verify;
exports.createVerify = function(algo, key, sig, sigEnc, options) {
  return new Verify(algo, key, sig, sigEnc, options);
};

util.inherits(Verify, Transform);

function Verify(algorithm, key, signature, sigEncoding, options) {
  if (!(this instanceof Verify))
    return new Verify(algorithm, key, signature, sigEncoding, options);

  if (typeof key === 'object') {
    options = key;
    key = options.key;
    signature = options.signature;
    sigEncoding = options.signatureEncoding;
  } else if (typeof signature === 'object') {
    options = signature;
    signature = options.signature;
    sigEncoding = options.signatureEncoding;
  } else if (typeof sigEncoding === 'object') {
    options = sigEncoding;
    sigEncoding = options.signatureEncoding;
  }

  this.key = key;
  this.signature = signature;
  this.signatureEncoding = sigEncoding;

  this._binding = new binding.Verify(algorithm);
  this._binding.init(algorithm);

  Transform.call(this, options);
}

Verify.prototype._transform = function(chunk, output, cb) {
  this._binding.update(chunk);
  cb();
};

Verify.prototype._flush = function(output, cb) {
  var key = this.key;
  var sig = this.signature;
  var sigEnc = this.signatureEncoding;
  var ret = this._binding.verify(key, sig, sigEnc);
  output(ret);
  cb();
};

Verify.prototype.update = function(chunk, encoding) {
  return this._binding.update(chunk, encoding);
};

Verify.prototype.verify = function(key, sig, enc) {
  return this._binding.verify(key, sig, enc);
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
exports.getDiffieHellman = function(group_name) {
  return new DiffieHellmanGroup(group_name);
};

exports.pbkdf2 = PBKDF2;

exports.randomBytes = randomBytes;
exports.pseudoRandomBytes = pseudoRandomBytes;

exports.rng = randomBytes;
exports.prng = pseudoRandomBytes;
