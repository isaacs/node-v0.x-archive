var assert = require('assert');
var common = require('../common');

var net = require('net');

net.createServer(function(conn) {
  conn.unref();
}).listen(8124).unref();

net.connect(8124, 'localhost').pause();

setTimeout(function() {
  assert.fail('expected to exit');
}, 1000).unref();
