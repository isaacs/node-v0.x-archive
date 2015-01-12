var common = require('../common');
var assert = require('assert');
var dns = require('dns');
var fs = require('fs');
var net = require('net');
var tracing = require('tracing');

var errorMsgs = [];
var caught = 0;
var expectCaught = 0;

var callbacksObj = {
  error: function(value, er) {
    var idx = errorMsgs.indexOf(er.message);
    caught++;

    process._rawDebug('Handling error: ' + er.message);

    if (-1 < idx)
      errorMsgs.splice(idx, 1);
    else
      throw new Error('Message not found: ' + er.message);

    return true;
  }
};

var listener = tracing.addAsyncListener(callbacksObj);

process.on('exit', function(code) {
  tracing.removeAsyncListener(listener);

  if (code > 0)
    return;

  if (errorMsgs.length > 0)
    throw new Error('Errors not fired: ' + errorMsgs);

  assert.equal(caught, expectCaught);
  process._rawDebug('ok');
});


// Net
var iter = 3;
for (var i = 0; i < iter; i++) {
  errorMsgs.push('net - error: server connection');
  errorMsgs.push('net - error: client data');
  errorMsgs.push('net - error: server data');
}
errorMsgs.push('net - error: server closed');

var server = net.createServer(function(c) {
  c.on('data', function() {
    if (0 === --iter) {
      server.close(function() {
        process._rawDebug('net - server closing');
        throw new Error('net - error: server closed');
      });
      expectCaught++;
    }
    process._rawDebug('net - connection received data');
    throw new Error('net - error: server data');
  });
  expectCaught++;

  c.end('bye');
  process._rawDebug('net - connection received');
  throw new Error('net - error: server connection');
});
expectCaught += iter;

server.listen(common.PORT, function() {
  for (var i = 0; i < iter; i++)
    clientConnect();
});

function clientConnect() {
  var client = net.connect(common.PORT, function() { });

  client.on('data', function() {
    client.end('see ya');
    process._rawDebug('net - client received data');
    throw new Error('net - error: client data');
  });
  expectCaught++;
}
