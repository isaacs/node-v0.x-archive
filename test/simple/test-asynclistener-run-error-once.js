var common = require('../common');
var assert = require('assert');
var net = require('net');
var tracing = require('tracing');

var errMsg = 'net - error: server connection';
var cntr = 0;
var al = tracing.addAsyncListener({
  error: function(stor, er) {
    cntr++;
    process._rawDebug('Handling error: ' + er.message);
    assert.equal(errMsg, er.message);
    return true;
  }
});

process.on('exit', function(status) {
  tracing.removeAsyncListener(al);

  console.log('exit status:', status);
  assert.equal(status, 0);
  console.log('cntr:', cntr);
  assert.equal(cntr, 1);
  console.log('ok');
});


var server = net.createServer(function(c) {
  this.close();
  throw new Error(errMsg);
});


server.listen(common.PORT, function() {
  net.connect(common.PORT, function() {
    this.destroy();
  });
});
