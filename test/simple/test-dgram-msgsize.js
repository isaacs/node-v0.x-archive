var common = require('../common');
var assert = require('assert');
var dgram = require('dgram');

// Send a too big datagram. The destination doesn't matter because it's
// not supposed to get sent out anyway.
var buf = Buffer(256 * 1024);
var sock = dgram.createSocket('udp4');
sock.send(buf, 0, buf.length, 12345, '127.0.0.1', common.mustCall(cb));
function cb(err) {
  assert(err instanceof Error);
  assert.equal(err.code, 'EMSGSIZE');
  sock.close();
}
