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

exports.Deflate = Deflate;
exports.Inflate = Inflate;
exports.Gzip = Gzip;
exports.Gunzip = Gunzip;
exports.DeflateRaw = DeflateRaw;
exports.InflateRaw = InflateRaw;

// generic zlib
// minimal 2-byte header
function Deflate(opts) {
  Zlib.call(this, opts, binding.Deflate);
}

util.inherits(Deflate, Zlib);

function Inflate(opts) {
  Zlib.call(this, opts, binding.Inflate);
}

util.inherits(Inflate, Zlib);


// gzip - bigger header, same deflate compression
function Gzip(opts) {
  Zlib.call(this, opts, binding.Gzip);
}

util.inherits(Gzip, Zlib);

function Gunzip(opts) {
  Zlib.call(this, opts, binding.Gunzip);
}

util.inherits(Gunzip, Zlib);


// raw - no header
function DeflateRaw(opts) {
  Zlib.call(this, opts, binding.DeflateRaw);
}

util.inherits(DeflateRaw, Zlib);

function InflateRaw(opts) {
  Zlib.call(this, opts, binding.InflateRaw);
}

util.inherits(InflateRaw, Zlib);


// the Zlib class they all inherit from
// This thing manages the queue of requests, and returns
// true or false if there is anything in the queue when
// you call the .write() method.

function Zlib(opts, Binding) {
  this._opts = opts;
  this._queue = [];
  this._processing = false;
  this._binding = new Binding({ opts.chunkSize || 0,
                                opts.level || -1,
                                opts.windowBits || 15,
                                opts.memLevel || 8,
                                opts.strategy || 0 });

  var self = this;
  this._binding.onData = function(c) {
    self.emit('data', cb);
  };

  this._binding.onDrain = function() {
    self.emit('drain');
  };

  this._binding.onEnd = function() {
    self.emit('end');
  };
}

util.inherits(Zlib, stream.Stream);

Zlib.prototype.write = function write(chunk, cb) {
  if (arguments.length === 1 && typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
  }

  var flushed = this._queue.length === 0;
  this._queue.push([chunk, cb]);
  this._process();

  return flushed;
};

Zlib.prototype.flush = function flush(cb) {
  return this.write(cb);
};

Zlib.prototype.end = function end(chunk, cb) {
  return this._binding.end(cb);
};

Zlib.prototype._process = function() {
  if (this._processing) return;
};
