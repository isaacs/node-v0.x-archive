var common = require('../common');
var assert = require('assert');
var dns = require('dns');
var fs = require('fs');
var net = require('net');
var tracing = require('tracing');

var addListener = tracing.addAsyncListener;
var removeListener = tracing.removeAsyncListener;
var errorMsgs = [];
var currentMsg = '';
var caught = 0;
var expectCaught = 0;
var exitCbRan = false;

var callbacksObj = {
  error: function(value, er) {
    var idx = errorMsgs.indexOf(er.message);

    caught++;

    if (-1 < idx)
      errorMsgs.splice(idx, 1);

    return currentMsg === er.message;
  }
};

var listener = tracing.createAsyncListener(callbacksObj);

process.on('exit', function(code) {
  removeListener(listener);

  // Something else went wrong, no need to further check.
  if (code > 0)
    return;

  // Make sure the exit callback only runs once.
  assert.ok(!exitCbRan);
  exitCbRan = true;

  // Check if any error messages weren't removed from the msg queue.
  if (errorMsgs.length > 0)
    throw new Error('Errors not fired: ' + errorMsgs);

  assert.equal(caught, expectCaught, 'caught all expected errors');
  process._rawDebug('ok');
});


// Catch synchronous throws
errorMsgs.push('sync throw');
process.nextTick(function() {
  addListener(listener);

  expectCaught++;
  currentMsg = 'sync throw';
  throw new Error(currentMsg);

  removeListener(listener);
});


// Simple cases
errorMsgs.push('setTimeout - simple');
errorMsgs.push('setImmediate - simple');
errorMsgs.push('setInterval - simple');
errorMsgs.push('process.nextTick - simple');
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    currentMsg = 'setTimeout - simple';
    throw new Error(currentMsg);
  });
  expectCaught++;

  setImmediate(function() {
    currentMsg = 'setImmediate - simple';
    throw new Error(currentMsg);
  });
  expectCaught++;

  var b = setInterval(function() {
    clearInterval(b);
    currentMsg = 'setInterval - simple';
    throw new Error(currentMsg);
  });
  expectCaught++;

  process.nextTick(function() {
    currentMsg = 'process.nextTick - simple';
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// Deeply nested
errorMsgs.push('setInterval - nested');
errorMsgs.push('setImmediate - nested');
errorMsgs.push('process.nextTick - nested');
errorMsgs.push('setTimeout2 - nested');
errorMsgs.push('setTimeout - nested');
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    process.nextTick(function() {
      setImmediate(function() {
        var b = setInterval(function() {
          clearInterval(b);
          currentMsg = 'setInterval - nested';
          throw new Error(currentMsg);
        });
        expectCaught++;
        currentMsg = 'setImmediate - nested';
        throw new Error(currentMsg);
      });
      expectCaught++;
      currentMsg = 'process.nextTick - nested';
      throw new Error(currentMsg);
    });
    expectCaught++;
    setTimeout(function() {
      currentMsg = 'setTimeout2 - nested';
      throw new Error(currentMsg);
    });
    expectCaught++;
    currentMsg = 'setTimeout - nested';
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// FS
errorMsgs.push('fs - file does not exist');
errorMsgs.push('fs - exists');
errorMsgs.push('fs - realpath');
process.nextTick(function() {
  addListener(listener);

  fs.stat('does not exist', function(err, stats) {
    currentMsg = 'fs - file does not exist';
    throw new Error(currentMsg);
  });
  expectCaught++;

  fs.exists('hi all', function(exists) {
    currentMsg = 'fs - exists';
    throw new Error(currentMsg);
  });
  expectCaught++;

  fs.realpath('/some/path', function(err, resolved) {
    currentMsg = 'fs - realpath';
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// Nested FS
errorMsgs.push('fs - nested file does not exist');
process.nextTick(function() {
  addListener(listener);

  setTimeout(function() {
    setImmediate(function() {
      var b = setInterval(function() {
        clearInterval(b);
        process.nextTick(function() {
          fs.stat('does not exist', function(err, stats) {
            currentMsg = 'fs - nested file does not exist';
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
errorMsgs.push('net - connection listener');
errorMsgs.push('net - client connect');
errorMsgs.push('net - server listening');
process.nextTick(function() {
  addListener(listener);

  var server = net.createServer(function(c) {
    server.close();
    currentMsg = 'net - connection listener';
    throw new Error(currentMsg);
  });
  expectCaught++;

  server.listen(common.PORT, function() {
    var client = net.connect(common.PORT, function() {
      client.end();
      currentMsg = 'net - client connect';
      throw new Error(currentMsg);
    });
    expectCaught++;
    currentMsg = 'net - server listening';
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});


// DNS
errorMsgs.push('dns - lookup');
process.nextTick(function() {
  addListener(listener);

  dns.lookup('localhost', function() {
    currentMsg = 'dns - lookup';
    throw new Error(currentMsg);
  });
  expectCaught++;

  removeListener(listener);
});
