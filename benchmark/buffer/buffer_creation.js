// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

/* Usage:
 *
 * --run: specify which test(s) to run
 * --len: how many itterations each test should run (default: 1e6)
 *
 * Example:
 *
 *   node buffer_creation.js --run 'Buffer - 1' --len 1e5
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var LEN = parsed.len || 1e6;
var SlowBuffer = require('buffer').SlowBuffer;

timer('Buffer - 1', function() {
  for (var i = 0; i < LEN; i++)
    Buffer(1);
});

timer('new Buffer - 1', function() {
  for (var i = 0; i < LEN; i++)
    new Buffer(1);
});

timer('Buffer - 100', function() {
  for (var i = 0; i < LEN; i++)
    Buffer(100);
});

timer('new Buffer - 100', function() {
  for (var i = 0; i < LEN; i++)
    new Buffer(100);
});

timer('Buffer - 1000', function() {
  for (var i = 0; i < LEN; i++)
    Buffer(1000);
});

timer('new Buffer - 1000', function() {
  for (var i = 0; i < LEN; i++)
    new Buffer(1000);
});

timer('Buffer - [10]', function() {
  for (var i = 0; i < LEN; i++)
    Buffer([0x0,0x1,0x2,0x3,0x4,0x5,0x6,0x7,0x8,0x9]);
});

timer('Buffer - str', function() {
  for (var i = 0; i < LEN; i++)
    Buffer('this is a string for testing', 'utf8');
});

timer('Buffer - poolSize', function() {
  for (var i = 0; i < LEN; i++)
    Buffer(Buffer.poolSize);
});

timer('SlowBuffer - 10', function() {
  for (var i = 0; i < LEN; i++)
    SlowBuffer(10);
});

timer('SlowBuffer - 100', function() {
  for (var i = 0; i < LEN; i++)
    SlowBuffer(100);
});

timer('SlowBuffer - 1000', function() {
  for (var i = 0; i < LEN; i++)
    SlowBuffer(1000);
});
