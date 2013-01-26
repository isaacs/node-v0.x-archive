/* Usage:
 *
 * --exec: specify which test(s) to run
 * --iter: how many iterations each test should run (default: 1e6)
 * --slow: toggle use of slow buffer
 * --noassert: toggle to enable noAssert
 *
 * Example:
 *
 *   node buffer_read.js --exec readUInt8 --iter 1e5 --slow --noassert
 */

var oc = require('../_buffer_callbacks').oncomplete;
var timer = require('bench-timer');
var params = timer.parse(process.argv);
var Buff = params.slow ? require('buffer').SlowBuffer : Buffer;
var noAssert = !!params.noassert;
var ITER = params.iter || 1e6;
var buff = Buff(8);
var oc_args = [ITER];

buff.fill(0, 0, buff.length);

timer('readUInt8', function() {
  for (var i = 0; i < ITER; i++)
    buff.readUInt8(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readUInt16LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readUInt16LE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readUInt16BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readUInt16BE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readUInt32LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readUInt32LE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readUInt32BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readUInt32BE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readInt8', function() {
  for (var i = 0; i < ITER; i++)
    buff.readInt8(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readInt16LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readInt16LE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readInt16BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readInt16BE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readInt32LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readInt32LE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readInt32BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readInt32BE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readFloatLE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readFloatLE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readFloatBE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readFloatBE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readDoubleLE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readDoubleLE(0, noAssert);
}).oncomplete(oc, oc_args);

timer('readDoubleBE', function() {
  for (var i = 0; i < ITER; i++)
    buff.readDoubleBE(0, noAssert);
}).oncomplete(oc, oc_args);

oc_args.push(timer.maxNameLength());
