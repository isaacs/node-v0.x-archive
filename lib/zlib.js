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

var binding = process.binding('zlib');
var util = require('util');
var stream = require('stream');

// Could perhaps expose other flush options if there's call for
// it, but these are the ones you usually want.
var Z_NO_FLUSH   = 0
var Z_SYNC_FLUSH = 2
var Z_FINISH     = 4

exports.Deflate = Deflate;
exports.Inflate = Inflate;
exports.Gzip = Gzip;
exports.Gunzip = Gunzip;
exports.DeflateRaw = DeflateRaw;
exports.InflateRaw = InflateRaw;

exports.createDeflate    = function (o) { return new Deflate(o);    };
exports.createInflate    = function (o) { return new Inflate(o);    };
exports.createDeflateRaw = function (o) { return new DeflateRaw(o); };
exports.createInflateRaw = function (o) { return new InflateRaw(o); };
exports.createGzip       = function (o) { return new Gzip(o);       };
exports.createGunzip     = function (o) { return new Gunzip(o);     };



// generic zlib
// minimal 2-byte header
function Deflate(opts) {
  if (!(this instanceof Deflate)) return new Deflate(options);
  Zlib.call(this, opts, binding.Deflate);
}

function Inflate(opts) {
  if (!(this instanceof Inflate)) return new Inflate(options);
  Zlib.call(this, opts, binding.Inflate);
}



// gzip - bigger header, same deflate compression
function Gzip(opts) {
  if (!(this instanceof Gzip)) return new Gzip(options);
  Zlib.call(this, opts, binding.Gzip);
}

function Gunzip(opts) {
  if (!(this instanceof Gunzip)) return new Gunzip(options);
  Zlib.call(this, opts, binding.Gunzip);
}



// raw - no header
function DeflateRaw(opts) {
  if (!(this instanceof DeflateRaw)) return new DeflateRaw(options);
  Zlib.call(this, opts, binding.DeflateRaw);
}

function InflateRaw(opts) {
  if (!(this instanceof InflateRaw)) return new InflateRaw(options);
  Zlib.call(this, opts, binding.InflateRaw);
}


// the Zlib class they all inherit from
// This thing manages the queue of requests, and returns
// true or false if there is anything in the queue when
// you call the .write() method.

function Zlib(opts, Binding) {
  this._opts = opts = opts || {};
  this._queue = [];
  this._processing = false;
  this._ended = false;
  this.readable = true;
  this.writable = true;
  this._flush = Z_NO_FLUSH;
  this._binding = new Binding(opts.chunkSize || 0,
                              opts.level || -1,
                              opts.windowBits || 15,
                              opts.memLevel || 8,
                              opts.strategy || 0);

  var self = this;

  this._binding.onData = function(c) {
    self.emit('data', c);
  };

  this._binding.onEnd = function() {
    self.emit('end');
  };
}

util.inherits(Zlib, stream.Stream);

Zlib.prototype.write = function write(chunk, cb) {
  if (this._ended) {
    return this.emit('error', new Error('Cannot write after end'));
  }

  if (arguments.length === 1 && typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
  }

  if (!chunk) {
    chunk = null;
  } else if (typeof chunk === 'string') {
    chunk = new Buffer(chunk);
  } else if (!Buffer.isBuffer(chunk)) {
    return this.emit('error', new Error('Invalid argument'));
  }


  var empty = this._queue.length === 0;

  this._queue.push([chunk, cb]);
  this._process();
  if (!empty) {
    this._needDrain = true;
  }
  return empty;
};

Zlib.prototype.flush = function flush(cb) {
  this._flush = Z_SYNC_FLUSH;
  return this.write(cb);
};

Zlib.prototype.end = function end(chunk, cb) {
  var self = this;
  this._ending = true;
  var ret = this.write(chunk, function() {
    self.emit('end');
    if (cb) cb();
  });
  this._ended = true;
  return ret;
};

Zlib.prototype._process = function() {
  if (this._processing || this._paused) return;

  if (this._queue.length === 0) {
    if (this._needDrain) {
      this._needDrain = false;
      this.emit('drain');
    }
    return;
  }

  var req = this._queue.shift();
  var cb = req.pop();
  var chunk = req.pop();

  if (this._ending && this._queue.length === 0) {
    this._flush = Z_FINISH;
  }

  var self = this;
  var b = this._binding;


  try {
    this._processing = b.write(chunk, this._flush, function() {
      self._processing = false;
      self._process();
      if (cb) cb();
    });
  } catch (er) {
    self.emit('error', er);
  }
};

Zlib.prototype.pause = function() {
  this._paused = true;
  this.emit('pause');
};

Zlib.prototype.resume = function() {
  this._paused = false;
  this.emit('resume');
};

util.inherits(Deflate, Zlib);
util.inherits(Inflate, Zlib);
util.inherits(Gzip, Zlib);
util.inherits(Gunzip, Zlib);
util.inherits(DeflateRaw, Zlib);
util.inherits(InflateRaw, Zlib);
