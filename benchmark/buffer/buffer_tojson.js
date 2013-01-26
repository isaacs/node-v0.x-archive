/* Usage:
 *
 * --exec: specify which test(s) to run
 * --iter: how many iterations each test should run (default: 1e5)
 * --slow: toggle use of slow buffer
 *
 * Example:
 *
 *   node buffer_tojson.js --exec 'toJSON - 1e2' --iter 1e5 --slow
 */

var oc = require('../_buffer_callbacks').oncomplete;
var timer = require('bench-timer');
var params = timer.parse(process.argv);
var Buff = params.slow ? require('buffer').SlowBuffer : Buffer;
var ITER = params.iter || 1e5;
var buf1e2 = Buff(1e2);
var buf1e3 = Buff(1e3);
var oc_args = [ITER];

timer('toJSON - 1e2', function() {
  for (var i = 0; i < ITER; i++)
    buf1e2.toJSON();
}).oncomplete(oc, oc_args);

timer('toJSON - 1e3', function() {
  for (var i = 0; i < ITER; i++)
    buf1e3.toJSON();
}).oncomplete(oc, oc_args);

oc_args.push(timer.maxNameLength());
