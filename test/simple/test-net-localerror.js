var common = require('../common');
var assert = require('assert');
var net = require('net');

var server = net.createServer(function(socket) {
  assert.ok(false, 'no clients should connect');
}).listen(common.PORT).on('listening', function() {
  server.unref();

  function test1(next) {
    connect({
      host: '127.0.0.1',
      port: common.PORT,
      localPort: 'foobar',
    },
    'localPort should be a number: foobar',
    next);
  }

  function test2(next) {
    connect({
      host: '127.0.0.1',
      port: common.PORT,
      localAddress: 'foobar',
    },
    'localAddress should be a valid IP: foobar',
    next)
  }

  test1(test2);
})

function connect(opts, msg, cb) {
  var client = net.connect(opts).on('connect', function() {
    assert.ok(false, 'we should never connect');
  }).on('error', function(err) {
    assert.strictEqual(err.message, msg);
    if (cb) cb();
  });
}
