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

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;
Writable.WritableState = WritableState;

var util = require('util');
var assert = require('assert');
var Stream = require('stream');

util.inherits(Writable, Stream);

function WritableState(options, stream) {
  options = options || {};

  var state = this;
  this.onwrite = function(er) {
    onwrite(stream, state, er);
  };

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // When a write returns false, set this.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' has emitted
  this.finished = false;
  // when 'finish' is being emitted
  this.finishing = false;

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.
  this.sync = false;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];
}

function Writable(options) {
  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Stream.Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Override this method or _write(chunk, cb)
Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (state.ended) {
    var er = new Error('write after end');
    if (typeof cb === 'function')
      cb(er);
    this.emit('error', er);
  } else {
    state.objectMode = checkObjectMode(state, chunk);

    return writeOrBuffer(this, state, chunk, encoding, cb);
  }
}

function checkObjectMode(state, chunk) {
  if (state.objectMode)
    return true;

  // Writing something other than a string or buffer will switch
  // the stream into objectMode.
  if (typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !Buffer.isBuffer(chunk))
    return true;

  return false;
}

function writeOrBuffer(stream, state, chunk, encoding, cb) {
  var len = state.objectMode ? 1 : chunk.length;

  // In the case of string chunks, this is not exact, but whatever.
  state.length += len;

  // if we're already in the process of writing something, then just
  // save it to the buffer for later.
  var ret;
  if (state.writing) {
    state.buffer.push([chunk, encoding || 'utf8', len, cb]);
    state.needDrain = true;
    ret = false;
  } else {
    doWrite(stream, state, chunk, encoding, len, cb);
    ret = true;
  }
  return ret;
}

function doWrite(stream, state, chunk, encoding, len, cb) {
  state.writing = true;
  state.sync = true;
  state.writelen = len;
  state.writecb = cb;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
};


function onwrite(stream, state, er) {
  var sync = state.sync;
  var cb = state.writecb;
  var len = state.writelen;

  state.writing = false;

  if (er)
    return onwriteError(stream, sync, er, cb);

  state.length -= len;

  if (cb) {
    // Don't call the cb until the next tick if we're in sync mode.
    if (sync)
      process.nextTick(cb);
    else
      cb();
  }

  if (state.length === 0 && onwriteMaybeFinish(state, stream))
    return;

  onwriteDrain(state, stream);

  onwriteProcessBuffer(state, stream);
}

function onwriteProcessBuffer(state, stream) {
  if (state.bufferProcessing || !state.buffer.length)
    return;

  // if there's something in the buffer waiting, then process it
  // It would be nice if there were TCO in JS, and we could just
  // shift the top off the buffer and _write that, but that approach
  // causes RangeErrors when you have a very large number of very
  // small writes, and is not very efficient otherwise.
  state.bufferProcessing = true;

  for (var c = 0, l = state.buffer.length; c < l; c++) {
    var args = state.buffer[c];
    var chunk = args[0];
    var enc = args[1];
    var len = args[2];
    var cb = args[3];

    state.writelen = len;
    state.writecb = cb;
    state.writechunk = chunk;
    state.writing = true;
    state.sync = true;
    stream._write(chunk, enc, state.onwrite);
    state.sync = false;

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}


function onwriteMaybeFinish(state, stream) {
  if (state.length === 0 && (state.ended || state.ending) &&
      !state.finished && !state.finishing) {
    // emit 'finish' at the very end.
    state.finishing = true;
    stream.emit('finish');
    state.finished = true;
    return true;
  }
  return false;
}

function onwriteDrain(state, stream) {
  if (state.needDrain) {
    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    process.nextTick(function() {
      if (!state.needDrain)
        return;
      state.needDrain = false;
      stream.emit('drain');
    });
  }
}

function onwriteError(stream, sync, er, cb) {
  if (cb) {
    // If _write(chunk,cb) calls cb() in this tick, we still defer
    // the *user's* write callback to the next tick.
    // Never present an external API that is *sometimes* async!
    if (sync)
      process.nextTick(function() {
        cb(er);
      });
    else
      cb(er);
  }

  // backwards compatibility.  still emit if there was a cb.
  stream.emit('error', er);
}



Writable.prototype._write = function(chunk, cb) {
  process.nextTick(function() {
    cb(new Error('not implemented'));
  });
};

Writable.prototype.end = function(chunk, encoding) {
  var state = this._writableState;

  // ignore unnecessary end() calls.
  if (state.ending || state.ended || state.finished)
    return;

  state.ending = true;
  if (chunk)
    this.write(chunk, encoding);
  else if (state.length === 0 && !state.finishing && !state.finished) {
    state.finishing = true;
    this.emit('finish');
    state.finished = true;
  }
  state.ended = true;
};
