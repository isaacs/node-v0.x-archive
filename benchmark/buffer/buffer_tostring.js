/* Usage:
 *
 * --exec: specify which test(s) to run
 * --iter: how many iterations each test should run (default: 1e6)
 * --slow: toggle use of slow buffer
 *
 * Example:
 *
 *   node buffer_tostring.js --exec 'utf8 - 1e2' --iter 1e5 --slow
 */

var oc = require('../_buffer_callbacks').oncomplete;
var timer = require('bench-timer');
var params = timer.parse(process.argv);
var Buff = params.slow ? require('buffer').SlowBuffer : Buffer;
var ITER = params.iter || 1e6;
var buf1e2 = Buff(1e2);
var buf1e4 = Buff(1e4);
var oc_args = [ITER];

buf1e2.fill(0x61, 0, buf1e2.length);
buf1e4.fill(0x61, 0, buf1e4.length);

timer('utf8 - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toString('utf8');
}).oncomplete(oc, oc_args);

timer('utf8 - 1e4', function() {
  for (var i = 0; i < ITER; i++)
    buf1e4.toString('utf8');
}).oncomplete(oc, oc_args);

timer('ascii - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toString('ascii');
}).oncomplete(oc, oc_args);

timer('ascii - 1e4', function() {
  for (var i = 0; i < ITER; i++)
    buf1e4.toString('ascii');
}).oncomplete(oc, oc_args);

timer('hex - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toString('hex');
}).oncomplete(oc, oc_args);

timer('base64 - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toString('base64');
}).oncomplete(oc, oc_args);

timer('base64 - 1e4', function() {
  for (var i = 0; i < ITER; i++)
    buf1e4.toString('base64');
}).oncomplete(oc, oc_args);

timer('ucs2 - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toString('ucs2');
}).oncomplete(oc, oc_args);

timer('ucs2 - 1e4', function() {
  for (var i = 0; i < ITER; i++)
    buf1e4.toString('ucs2');
}).oncomplete(oc, oc_args);

oc_args.push(timer.maxNameLength());
