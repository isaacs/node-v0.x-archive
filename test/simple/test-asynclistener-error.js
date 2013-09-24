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


var common = require('../common');
var assert = require('assert');
var dns = require('dns');
var fs = require('fs');
var net = require('net');
var addListener = process.addAsyncListener;
var removeListener = process.removeAsyncListener;
var errorMsgs = [];
var currentMsg = '';

var caught = 0;
var expectCaught = 0;

function asyncL() { }

var callbacksObj = {
  error: function(value, er) {
    var idx = errorMsgs.indexOf(er.message);

    caught++;

    if (-1 < idx)
      errorMsgs.splice(idx, 1);

    return currentMsg === er.message;
  }
};

var listener = process.createAsyncListener(asyncL, callbacksObj);

process.on('exit', function(code) {
  removeListener(listener);

  if (errorMsgs.length > 0)
    throw new Error('Errors not fired: \'' + errorMsgs.join('\', \'') + '\'');

  if (code > 0)
    return;

  process._rawDebug('caught:', caught);
  process._rawDebug('expected:', expectCaught);
  assert.equal(caught, expectCaught, 'caught all expected errors');
  process._rawDebug('ok');
});


// Catch synchronous throws
process.nextTick(function() {
  addListener(listener);

  expectCaught++;
  errorMsgs.push(currentMsg = 'sync throw');
  throw new Error(currentMsg);

  removeListener(listener);
});


// Simple cases
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    errorMsgs.push(currentMsg = 'setTimeout - simple');
    throw new Error(currentMsg);
  });
  expectCaught++;

  setImmediate(function() {
    errorMsgs.push(currentMsg = 'setImmediate - simple');
    throw new Error(currentMsg);
  });
  expectCaught++;

  var b = setInterval(function() {
    clearInterval(b);
    errorMsgs.push(currentMsg = 'setInterval - simple');
    throw new Error(currentMsg);
  });
  expectCaught++;

  process.nextTick(function() {
    errorMsgs.push(currentMsg = 'process.nextTick - simple');
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// Deeply nested
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    process.nextTick(function() {
      setImmediate(function() {
        var b = setInterval(function() {
          clearInterval(b);
          errorMsgs.push(currentMsg = 'setInterval - nested');
          throw new Error(currentMsg);
        });
        expectCaught++;
        errorMsgs.push(currentMsg = 'setImmediate - nested');
        throw new Error(currentMsg);
      });
      expectCaught++;
      errorMsgs.push(currentMsg = 'process.nextTick - nested');
      throw new Error(currentMsg);
    });
    expectCaught++;
    setTimeout(function() {
      errorMsgs.push(currentMsg = 'setTimeout2 - nested');
      throw new Error(currentMsg);
    });
    expectCaught++;
    errorMsgs.push(currentMsg = 'setTimeout - nested');
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// FS
process.nextTick(function() {
  addListener(listener);

  fs.stat('does not exist', function(err, stats) {
    errorMsgs.push(currentMsg = 'fs - file does not exist');
    throw new Error(currentMsg);
  });
  expectCaught++;

  fs.exists('hi all', function(exists) {
    errorMsgs.push(currentMsg = 'fs - exists');
    throw new Error(currentMsg);
  });
  expectCaught++;

  fs.realpath('/some/path', function(err, resolved) {
    errorMsgs.push(currentMsg = 'fs - realpath');
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// Nested FS
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    setImmediate(function() {
      var b = setInterval(function() {
        clearInterval(b);
        process.nextTick(function() {
          fs.stat('does not exist', function(err, stats) {
            errorMsgs.push(currentMsg = 'fs - nested file does not exist');
            throw new Error(currentMsg);
          });
          expectCaught++;
        });
      });
    });
  });

  removeListener(listener);
});


// Net
process.nextTick(function() {
  addListener(listener);

  var server = net.createServer(function(c) {
    server.close();
    errorMsgs.push(currentMsg = 'net - connection listener');
    throw new Error(currentMsg);
  });
  expectCaught++;

  server.listen(common.PORT, function() {
    var client = net.connect(common.PORT, function() {
      client.end();
      errorMsgs.push(currentMsg = 'net - client connect');
      throw new Error(currentMsg);
    });
    expectCaught++;
    errorMsgs.push(currentMsg = 'net - server listening');
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// DNS
process.nextTick(function() {
  addListener(listener);

  dns.lookup('localhost', function() {
    errorMsgs.push(currentMsg = 'dns - lookup');
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});
