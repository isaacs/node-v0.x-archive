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

var assert = require('assert').ok;
var Stream = require('stream');
var Writable = Stream.Writable;
var timers = require('timers');
var util = require('util');

var common = require('_http_common');

var CRLF = common.CRLF;
var chunkExpression = common.chunkExpression;
var continueExpression = common.continueExpression;
var debug = common.debug;


var connectionExpression = /Connection/i;
var transferEncodingExpression = /Transfer-Encoding/i;
var closeExpression = /close/i;
var contentLengthExpression = /Content-Length/i;
var dateExpression = /Date/i;
var expectExpression = /Expect/i;
var crlfBuf = new Buffer('\r\n');


var dateCache;
function utcDate() {
  if (!dateCache) {
    var d = new Date();
    dateCache = d.toUTCString();
    timers.enroll(utcDate, 1000 - d.getMilliseconds());
    timers._unrefActive(utcDate);
  }
  return dateCache;
}
utcDate._onTimeout = function() {
  dateCache = undefined;
};


function OutgoingMessage(options) {
  Writable.call(this, options);
  this._writableState.decodeStrings = false;

  this.writable = true;
  this._headerSent = false;

  this._last = false;
  this.chunkedEncoding = false;
  this.shouldKeepAlive = true;
  this.useChunkedEncodingByDefault = true;
  this.sendDate = false;

  this._hasBody = true;
  this._trailer = '';

  this.finished = false;
  this._hangupClose = false;

  this.socket = null;
  this.connection = null;

  this.rawHeaders = [];
  this._headerIndexes = {};
}
util.inherits(OutgoingMessage, Writable);


exports.OutgoingMessage = OutgoingMessage;


OutgoingMessage.prototype.setTimeout = function(msecs, callback) {
  if (callback)
    this.on('timeout', callback);
  if (!this.socket) {
    this.once('socket', function(socket) {
      socket.setTimeout(msecs);
    });
  } else
    this.socket.setTimeout(msecs);
};


// Don't bother with write() calls to destroyed sockets.  In those cases,
// we're just waiting for the 'close' event coming right now anyway.
//
// XXX(isaacs): If it was less performance-critical, it might be more
// sensible to make OutgoingMessage a Transform stream, and pipe it to the
// Socket.
OutgoingMessage.prototype.write = function(chunk, encoding, cb) {
  var ret;
  if (!this._hasBody) {
    debug('This type of response MUST NOT have a body. Ignoring write.');
    ret = true;
  } else if (this.socket && this.socket.destroyed) {
    ret = false;
  } else {
    ret = Writable.prototype.write.call(this, chunk, encoding, cb);
  }
  return ret;
};


OutgoingMessage.prototype._write = function(chunk, encoding, cb) {
  assert(util.isFunction(cb));
  if (!this._hasBody) {
    debug('This type of response MUST NOT have a body. Ignoring write.');
    cb();
  } else if (!this.socket) {
    debug('Outgoing %s _write no socket', this.constructor.name);
    this.once('socket', function(socket) {
      this._write(chunk, encoding, cb);
    });
  } else {
    debug('Outgoing %s _write has socket', this.constructor.name);
    if (!this._headerSent)
      this._sendHeader();

    var state = this._writableState;
    var lastWrite = false;
    if (state.ending && state.buffer.length === 1) {
      debug('Outgoing %s _write lastWrite', this.constructor.name);
      lastWrite = true;
    } else {
      debug('Outgoing %s _write not lastWrite', this.constructor.name,
            state.buffer);
    }

    var socket = this.socket;
    var isString = util.isString(chunk);
    var len = isString ? Buffer.byteLength(chunk, encoding) : chunk.length;
    if (this.chunkedEncoding) {
      //XXX(isaacs): Still worth doing this now that we have writev?
      if (isString &&
          encoding !== 'hex' &&
          encoding !== 'base64' &&
          encoding !== 'binary') {
        if (len > 0)
          chunk = len.toString(16) + CRLF + chunk + CRLF;
        else
          chunk = '';
        if (lastWrite)
          chunk += '0\r\n' + this._trailer + '\r\n';
        socket.write(chunk, encoding, cb);
      } else {
        // buffer, or a non-toString-friendly encoding
        // debug('Outgoing use corks');
        socket.cork();
        if (len > 0) {
          socket.write(len.toString(16), 'ascii', null);
          socket.write(crlfBuf, null, null);
          socket.write(chunk, encoding, null);
        }
        if (lastWrite) {
          socket.write(crlfBuf);
          socket.write('0\r\n' + this._trailer + '\r\n', 'ascii', cb);
        } else {
          socket.write(crlfBuf, null, cb);
        }
        socket.uncork();
      }
    } else {
      // debug('Outgoing plain write encoding=%j len=%d', encoding, len);
      socket.write(chunk, encoding, cb);
    }
  }
};

OutgoingMessage.prototype.attachSocket = function(socket) {
  assert(!socket._httpMessage);
  socket._httpMessage = this;
  socket.on('close', outgoingSocketClose);
  this.socket = socket;
  this.connection = socket;
  this.emit('socket', socket);
};



// EventEmitter.emit makes a copy of the 'close' listeners array before
// calling the listeners. detachSocket() unregisters outgoingSocketClose
// but if detachSocket() is called, directly or indirectly, by a 'close'
// listener, outgoingSocketClose is still in that copy of the listeners
// array. That is, in the example below, b still gets called even though
// it's been removed by a:
//
//   var obj = new events.EventEmitter;
//   obj.on('event', a);
//   obj.on('event', b);
//   function a() { obj.removeListener('event', b) }
//   function b() { throw "BAM!" }
//   obj.emit('event');  // throws
//
// Ergo, we need to deal with stale 'close' events and handle the case
// where the ServerResponse object has already been deconstructed.
// Fortunately, that requires only a single if check. :-)
function outgoingSocketClose() {
  if (this._httpMessage)
    this._httpMessage.emit('close');
}

OutgoingMessage.prototype.detachSocket = function(socket) {
  assert(socket._httpMessage == this);
  socket.removeListener('close', outgoingSocketClose);
  socket._httpMessage = null;
  this.socket = this.connection = null;
};

// It's possible that the socket will be destroyed, and removed from
// any messages, before ever calling this.  In that case, just skip
// it, since something else is destroying this connection anyway.
OutgoingMessage.prototype.destroy = function(error) {
  if (this.socket)
    this.socket.destroy(error);
  else
    this.once('socket', function(socket) {
      socket.destroy(error);
    });
};


OutgoingMessage.prototype._firstLine = function() {
  throw new Error('not implemented');
};


// TODO(isaacs): Split this up for inline-friendliness
OutgoingMessage.prototype._sendHeader = function() {
  if (this._headerSent || this._headerSending)
    throw new Error('Cannot send header twice');

  debug('Outgoing sendHeader');
  this._headerSending = true;

  // firstLine in the case of request is: 'GET /index.html HTTP/1.1\r\n'
  // in the case of response it is: 'HTTP/1.1 200 OK\r\n'
  var state = new HeaderState(this._firstLine());

  var field, value;
  var self = this;

  var headers = this.rawHeaders;
  for (var i = 0; i < headers.length; i += 2) {
    storeHeader(this, state, headers[i], headers[i + 1]);
  }

  // Date header
  if (this.sendDate == true && state.sentDateHeader == false)
    state.messageHeader += 'Date: ' + utcDate() + CRLF;

  // Force the connection to close when the response is a 204 No Content
  // or a 304 Not Modified and the user has set a "Transfer-Encoding:
  // chunked" header.
  //
  // RFC 2616 mandates that 204 and 304 responses MUST NOT have a body but
  // node.js used to send out a zero chunk anyway to accommodate clients
  // that don't have special handling for those responses.
  //
  // It was pointed out that this might confuse reverse proxies to the
  // point of creating security liabilities, so suppress the zero chunk
  // and force the connection to close.
  var statusCode = this.statusCode;
  if ((statusCode == 204 || statusCode === 304) &&
      this.chunkedEncoding === true) {
    debug(statusCode + ' response should not use chunked encoding,' +
          ' closing connection.');
    this.chunkedEncoding = false;
    this.shouldKeepAlive = false;
  }

  // keep-alive logic
  if (state.sentConnectionHeader === false) {
    var shouldSendKeepAlive = this.shouldKeepAlive &&
        (state.sentContentLengthHeader ||
         this.useChunkedEncodingByDefault ||
         this.agent);
    if (shouldSendKeepAlive) {
      state.messageHeader += 'Connection: keep-alive\r\n';
    } else {
      this._last = true;
      state.messageHeader += 'Connection: close\r\n';
    }
  }

  if (state.sentContentLengthHeader == false &&
      state.sentTransferEncodingHeader == false) {
    if (this._hasBody) {
      if (this.useChunkedEncodingByDefault) {
        state.messageHeader += 'Transfer-Encoding: chunked\r\n';
        this.chunkedEncoding = true;
      } else {
        this._last = true;
      }
    } else {
      // Make sure we don't end the 0\r\n\r\n at the end of the message.
      this.chunkedEncoding = false;
    }
  }

  this._header = state.messageHeader + CRLF;
  this._headerSent = true;
  debug('Outgoing header %j', this._header);
  this.socket.write(this._header, 'ascii');
};


// Protect against response splitting. The if statement is there to
// minimize the performance impact in the common case.
function storeHeader(self, state, field, value) {
  if (/[\r\n]/.test(value))
    value = value.replace(/[\r\n]+[ \t]*/g, '');

  state.messageHeader += field + ': ' + value + CRLF;

  if (connectionExpression.test(field)) {
    state.sentConnectionHeader = true;
    if (closeExpression.test(value))
      self._last = true;
    else
      self.shouldKeepAlive = true;
  } else if (transferEncodingExpression.test(field)) {
    state.sentTransferEncodingHeader = true;
    if (chunkExpression.test(value))
      self.chunkedEncoding = true;
  } else if (contentLengthExpression.test(field))
    state.sentContentLengthHeader = true;
  else if (dateExpression.test(field))
    state.sentDateHeader = true;
  else if (expectExpression.test(field))
    state.sentExpect = true;
}


OutgoingMessage.prototype.setHeader = function(name, value) {
  if (!util.isString(name) || util.isNullOrUndefined(value))
    throw new Error('`name` and `value` are required for setHeader().');

  value = value + '';

  if (this._headerSent)
    throw new Error('Can\'t set headers after they are sent.');

  var key = name.toLowerCase();
  if (this._headerIndexes[key] && this._headerIndexes[key].length) {
    for (var i = 0; i < this._headerIndexes[key].length; i++) {
      var idx = this._headerIndexes[key][i];
      this.rawHeaders[idx] = this.rawHeaders[idx + 1] = '';
    }
    this._headerIndexes[key].length = 0;
  }

  this.addHeader(name, value);
};


OutgoingMessage.prototype.setHeaders = function(headers) {
  debug('OutgongMessage setHeaders', headers);
  if (util.isArray(headers)) {
    for (var i = 0, len = headers.length; i < len; i++) {
      this.setHeader(headers[i][0], headers[i][1]);
    }
  } else if (headers && util.isObject(headers)) {
    var keys = Object.keys(headers);
    for (var i = 0, len = keys.length; i < len; i++) {
      this.setHeader(keys[i], headers[keys[i]]);
    }
  } else {
    throw new Error('invalid headers');
  }
};


OutgoingMessage.prototype.getHeader = function(name) {
  if (!util.isString(name))
    throw new Error('`name` is required for getHeader().');

  var key = name.toLowerCase();
  var indexes = this._headerIndexes[key];
  var array = (key === 'set-cookie');
  var res;
  if (!indexes || !indexes.length) {
    res = array ? [] : '';
  } else if (indexes.length === 1) {
    var value = this.rawHeaders[indexes[0] + 1];
    res = array ? [value] : value;
  } else {
    res = [];
    for (var i = 0; i < indexes.length; i++) {
      res.push(this.rawHeaders[indexes[i] + 1]);
    }
    if (!array)
      res = res.join(',');
  }

  return res;
};


OutgoingMessage.prototype.removeHeader = function(name) {
  if (!util.isString(name))
    throw new Error('`name` is required for removeHeader().');

  if (this._headerSent)
    throw new Error('Can\'t remove headers after they are sent.');

  var key = name.toLowerCase();
  var indexes = this._headerIndexes[key];
  if (indexes) {
    for (var i = 0; i < indexes.length; i++) {
      this.rawHeaders[i] = this.rawHeaders[i + 1] = '';
    }
    delete this._headerIndexes[key];
  }
};


OutgoingMessage.prototype.addHeader = function(name, value) {
  if (!util.isString(name) || !util.isString(value))
    throw new Error('`name` and `value` are required for addHeader().');

  if (this._headerSent)
    throw new Error('Can\'t add headers after they are sent.');

  var key = name.toLowerCase();
  var idx = this.rawHeaders.length;
  if (!this._headerIndexes[key])
    this._headerIndexes[key] = [idx];
  else
    this._headerIndexes[key].push(idx);

  this.rawHeaders.push(name, value);
};


Object.defineProperty(OutgoingMessage.prototype, 'headersSent', {
  configurable: true,
  enumerable: true,
  get: function() { return !!this._headerSent; }
});




OutgoingMessage.prototype.addTrailers = function(headers) {
  this._trailer = '';
  var keys = Object.keys(headers);
  var isArray = util.isArray(headers);
  var field, value;
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    if (isArray) {
      field = headers[key][0];
      value = headers[key][1];
    } else {
      field = key;
      value = headers[key];
    }

    this._trailer += field + ': ' + value + CRLF;
  }
};


OutgoingMessage.prototype.end = function(chunk, encoding, cb) {
  debug('Outgoing %s end', this.constructor.name);
  if (!this.socket) {
    debug('Outgoing %s end no socket', this.constructor.name);
    this.once('socket', function() {
      this.end(chunk, encoding, cb);
    });
  } else {
    assert.equal(this.socket._httpMessage, this);
    if (!util.isNullOrUndefined(chunk) &&
        !util.isFunction(chunk)) {
      if (util.isFunction(encoding)) {
        cb = encoding;
        encoding = null;
      }
      debug('end: has chunk, call write');
      this.write(chunk, encoding);
      chunk = null;
      encoding = null;
    } else if (util.isFunction(chunk)) {
      cb = chunk;
      chunk = null;
      encoding = null;
    }

    var state = this._writableState;
    if (state.buffer.length === 0) {
      debug('end: nothing in buffer, send trailers');
      this.socket.cork();
      if (!this._headerSent)
        this._sendHeader();
      if (this.chunkedEncoding)
        this.socket.write('0\r\n' + this._trailer + '\r\n', 'ascii', cb);
      this.socket.uncork();
    } else {
      debug('end: still something in buffer', state.buffer);
    }
    return Writable.prototype.end.call(this, chunk, encoding, cb);
  }
};


function HeaderState(firstLine) {
  this.sentConnectionHeader = false;
  this.sentContentLengthHeader = false;
  this.sentTransferEncodingHeader = false;
  this.sentDateHeader = false;
  this.sentExpect = false;
  this.messageHeader = firstLine;
}
