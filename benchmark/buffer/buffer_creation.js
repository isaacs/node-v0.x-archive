/* Usage:
 *
 * --exec: specify which test(s) to run
 * --iter: how many iterations each test should run (default: 1e6)
 *
 * Example:
 *
 *   node buffer_creation.js --exec 'Buffer - 1' --iter 1e5
 */

var oc = require('../_buffer_callbacks').oncomplete;
var timer = require('bench-timer');
var params = timer.parse(process.argv);
var ITER = params.iter || 1e6;
var SlowBuffer = require('buffer').SlowBuffer;
var oc_args = [ITER];

timer('Buffer - 1', function() {
  for (var i = 0; i < ITER; i++)
    Buffer(1);
}).oncomplete(oc, oc_args);

timer('new Buffer - 1', function() {
  for (var i = 0; i < ITER; i++)
    new Buffer(1);
}).oncomplete(oc, oc_args);

timer('Buffer - 100', function() {
  for (var i = 0; i < ITER; i++)
    Buffer(100);
}).oncomplete(oc, oc_args);

timer('new Buffer - 100', function() {
  for (var i = 0; i < ITER; i++)
    new Buffer(100);
}).oncomplete(oc, oc_args);

timer('Buffer - 1000', function() {
  for (var i = 0; i < ITER; i++)
    Buffer(1000);
}).oncomplete(oc, oc_args);

timer('new Buffer - 1000', function() {
  for (var i = 0; i < ITER; i++)
    new Buffer(1000);
}).oncomplete(oc, oc_args);

timer('Buffer - [10]', function() {
  for (var i = 0; i < ITER; i++)
    Buffer([0x0,0x1,0x2,0x3,0x4,0x5,0x6,0x7,0x8,0x9]);
}).oncomplete(oc, oc_args);

timer('Buffer - str', function() {
  for (var i = 0; i < ITER; i++)
    Buffer('this is a string for testing', 'utf8');
}).oncomplete(oc, oc_args);

timer('Buffer - poolSize', function() {
  for (var i = 0; i < ITER; i++)
    Buffer(Buffer.poolSize);
}).oncomplete(oc, oc_args);

timer('SlowBuffer - 1', function() {
  for (var i = 0; i < ITER; i++)
    SlowBuffer(1);
}).oncomplete(oc, oc_args);

timer('new SlowBuffer - 1', function() {
  for (var i = 0; i < ITER; i++)
    new SlowBuffer(1);
}).oncomplete(oc, oc_args);

timer('SlowBuffer - 100', function() {
  for (var i = 0; i < ITER; i++)
    SlowBuffer(100);
}).oncomplete(oc, oc_args);

timer('new SlowBuffer - 100', function() {
  for (var i = 0; i < ITER; i++)
    new SlowBuffer(100);
}).oncomplete(oc, oc_args);

timer('SlowBuffer - 1000', function() {
  for (var i = 0; i < ITER; i++)
    SlowBuffer(1000);
}).oncomplete(oc, oc_args);

timer('new SlowBuffer - 1000', function() {
  for (var i = 0; i < ITER; i++)
    new SlowBuffer(1000);
}).oncomplete(oc, oc_args);

oc_args.push(timer.maxNameLength());
