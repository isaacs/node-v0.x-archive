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

var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;

Stream.Readable = Readable;
Stream.Writable = Writable;
Stream.Duplex = Duplex;

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

// Backwards-compat with node 0.6.x
// Deprecated!  Much better to use the Readable class's pipe() method.
Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (dest.destroy) dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};


// The base class for readable streams.
// Provides .read(n), abstract ._read(n, cb), and .pipe(dest)

util.inherits(Readable, Stream);

function Readable(options) {
  options = options || {};
  this.bufferSize = options.bufferSize || 16 * 1024;
  this.lowWaterMark = options.lowWaterMark || 1024;
  this.buffer = [];
  this.length = 0;
  this._pipes = [];
  this._flowing = false;
  Stream.apply(this);
}

// you can override either this method, or _read(n, cb) below.
Readable.prototype.read = function(n) {
  if (this.length === 0 && this.ended) {
    process.nextTick(this.emit.bind(this, 'end'));
    return null;
  }

  if (isNaN(n) || n <= 0) n = this.length;
  n = Math.min(n, this.length);

  var ret = n > 0 ? fromList(n, this.buffer, this.length) : null;
  this.length -= n;

  if (!this.ended && this.length < this.lowWaterMark) {
    this._read(this.bufferSize, function onread(er, chunk) {
      if (er) return this.emit('error', er);

      if (!chunk || !chunk.length) {
        this.ended = true;
        if (this.length === 0) this.emit('end');
        return;
      }

      this.length += chunk.length;
      this.buffer.push(chunk);
      if (this.length < this.lowWaterMark) {
        this._read(this.bufferSize, onread.bind(this));
      }
      this.emit('readable');
    }.bind(this));
  }

  return ret;
};

// abstract method.  to be overridden in specific implementation classes.
Readable.prototype._read = function(n, cb) {
  process.nextTick(cb.bind(this, new Error('not implemented')));
};

Readable.prototype.pipe = function(dest, opt) {
  var src = this;
  src._pipes.push(dest);
  if ((!opt || opt.end !== false) &&
      dest !== process.stdout &&
      dest !== process.stderr) {
    src.once('end', onend);
    dest.on('unpipe', function(readable) {
      if (readable === src) {
        src.removeListener('end', onend);
      }
    });
  }

  dest.emit('pipe', src);
  if (!src._flowing) process.nextTick(flow.bind(src));
  return dest;

  function onend() {
    dest.end();
  }
};

function flow(src) {
  if (!src) src = this;
  var chunk;
  var dest;
  var needDrain = 0;
  while (chunk = src.read()) {
    src._pipes.forEach(function(dest, i, list) {
      var written = dest.write(chunk);
      if (false === written) {
        needDrain++;
        dest.once('drain', ondrain);
      }
    });
    if (needDrain > 0) return;
  }

  src.once('readable', flow);

  function ondrain() {
    needDrain--;
    if (needDrain === 0) {
      flow(src);
    }
  }
}

Readable.prototype.unpipe = function(dest) {
  if (!dest) {
    // remove all of them.
    this._pipes.forEach(function(dest, i, list) {
      dest.emit('unpipe', this);
    }, this);
    this._pipes.length = 0;
  } else {
    var i = this._pipes.indexOf(dest);
    if (i !== -1) {
      dest.emit('unpipe', this);
      this._pipes.splice(i, 1);
    }
  }
  return this;
};

// kludge for on('data', fn) consumers.  Sad.
// This is *not* an official part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.on = function(ev, fn) {
  if (ev === 'data') emitDataEvents(this);
  return Stream.prototype.on.call(this, ev, fn);
};
Readable.prototype.addListener = Readable.prototype.on;

function emitDataEvents(stream) {
  var paused = false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addEventListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;
    var c;
    while (!paused && (c = stream.read())) {
      stream.emit('data', c);
    }
    if (c === null) readable = false;
  });

  stream.pause = function() {
    paused = true;
  };

  stream.resume = function() {
    paused = false;
    if (readable) stream.emit('readable');
  };
}

// wrap an old-style stream
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  this.buffer = [];
  this.length = 0;
  var paused = false;
  var ended = false;

  stream.on('end', function() {
    ended = true;
    if (this.length === 0) {
      this.emit('end');
    }
  }.bind(this));

  stream.on('data', function(chunk) {
    this.buffer.push(chunk);
    this.length += chunk.length;
    this.emit('readable');
    // if not consumed, then pause the stream.
    if (this.length > this.lowWaterMark && !paused) {
      paused = true;
      stream.pause();
    }
  }.bind(this));

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  events.forEach(function(ev) {
    stream.on(ev, this.emit.bind(this, ev));
  }.bind(this));

  // consume some bytes.  if not all is consumed, then
  // pause the underlying stream.
  this.read = function(n) {
    if (this.length === 0) return null;

    if (isNaN(n) || n <= 0) n = this.length;

    var ret = fromList(n, this.buffer, this.length);
    this.length = Math.max(0, this.length - n);

    if (this.length < this.lowWaterMark && paused) {
      stream.resume();
      paused = false;
    }

    if (this.length === 0 && ended) {
      process.nextTick(this.emit.bind(this, 'end'));
    }
    return ret;
  };
};


// Read n bytes from the supplied list of buffers.
// the length is the sum of all the buffers in the list.
function fromList(n, list, length) {
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0) {
    return null;
  }

  if (typeof length === 'undefined') {
    // didn't tell us the length of the list.
    // flatten and proceed from there.
    var buf = Buffer.concat(list);
    length = buf.length;
    list.length = 0;
    list.push(buf);
  }

  if (length === 0) {
    ret = null;
  } else if (!n || n >= length) {
    // read it all, truncate the array.
    ret = Buffer.concat(list);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      ret = new Buffer(n);
      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list.shift();
        var cpy = Math.min(n - c, buf.length);
        buf.copy(ret, c, 0, cpy);
        if (cpy < buf.length) {
          list.unshift(buf.slice(cpy));
        }
        c += cpy;
      }
    }
  }

  return ret;
}


util.inherits(Writable, Stream);

function Writable(options) {
  // buffer management
  this.writeLength = 0;

  // the point at which write returns false
  this.highWaterMark = options.highWaterMark || 16 * 1024;

  // the point at which drain is emitted
  this.lowWaterMark = options.lowWaterMark || 1024;

  this._needDrain = false;
  this._ended = false;
  Stream.call(this);
}

// Override this method for sync streams
// override the _write(chunk, cb) method for async streams
Writable.prototype.write = function(chunk) {
  var ret = this.writeLength >= this.highWaterMark;
  if (ret === false) {
    this._needDrain = true;
  }
  var l = chunk.length;
  this.writeLength += l;
  this._write(chunk, function(er) {
    if (er) {
      this.emit('error', er);
      return;
    }
    this.writeLength -= l;

    if (this.writeLength === 0 && this._ended) {
      this.emit('end');
      return;
    }

    if (this.writeLength < this.lowWaterMark && this._needDrain) {
      this._needDrain = false;
      this.emit('drain');
    }
  }.bind(this));
};

Writable.prototype._write = function(chunk, cb) {
  process.nextTick(cb.bind(this, new Error('not implemented')));
};

Writable.prototype.end = function(chunk) {
  if (chunk) {
    this.write(chunk);
  }
  this._ended = true;
};


// Readable is the favored parent simply because Writable
// has fewer methods to copy over.  Essentially, though, it
// is just an arbitrary thing that reads and writes.
util.inherits(Duplex, Readable);

function Duplex(options) {
  Readable.call(this, options);
  Writable.call(this, options);
}

Object.keys(Writable.prototype).forEach(function(method) {
  Duplex.prototype[method] = Writable.prototype[method];
});


// Filter is similar to Duplex in that it is both readable and
// writable, but it's different in that the output is somewhat directly
// connected to the input.  For example, the Zlib classes would all
// be in this category.  So, instead of implementing a _write(chunk, cb)
// method, you implement a _filter(chunk, cb) function instead.

util.inherits(Filter, Duplex);

function Filter(options) {
  Readable.call(this, options);
  Writable.call(this, options);
}

Filter.prototype._write = function(chunk, cb) {
  var needEmitReadable = this.writeLength === 0;
  var origLength = chunk.length;
  this._filter(chunk, function(er, chunk) {
    if (er) {
      this.emit('error', er);
      return;
    }

    var l;
    if (!chunk || !chunk.length) l = 0;
    else l = chunk.length;

    // length can and often does change.  correct as we go.
    var diff = l - origLength;
    this.writeLength += diff;

    // filtered out, nothing to do.
    if (!l) return;

    this.buffer.push(chunk);
    if (needEmitReadable) this.emit('readable');
  }.bind(this));
};

// cb(error, transformedChunk)
Filter.prototype._filter = function(chunk, cb) {
  process.nextTick(cb.bind(this, new Error('not implemented')));
};

Filter.prototype.read = function(n) {
  if (!n || n >= this.length) n = this.length;
  var ret = fromList(n, this.buffer, this.length);
  this.length = Math.max(this.length - n, 0);
  if (this.length === 0) {
    var ev = this.ended ? 'end' : 'drain';
    process.nextTick(this.emit.bind(this, ev));
  }
  return ret;
};
