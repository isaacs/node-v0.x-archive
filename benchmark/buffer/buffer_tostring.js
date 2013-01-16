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
 * --type: whether to use a 'fast' or 'slow' buffer (default: fast)
 *
 * Example:
 *
 *   node buffer_tostring.js --run 'utf8 - 1e2' --len 1e5 --type slow
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var LEN = parsed.len || 1e6;
var buf1e2 = Buff(1e2);
var buf1e4 = Buff(1e4);

buf1e2.fill(0x61, 0, buf1e2.length);
buf1e4.fill(0x61, 0, buf1e4.length);

timer('utf8 - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buf1e2.toString('utf8');
});

timer('utf8 - 1e4', function() {
  for (var i = 0; i < LEN; i++)
    buf1e4.toString('utf8');
});

timer('ascii - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buf1e2.toString('ascii');
});

timer('ascii - 1e4', function() {
  for (var i = 0; i < LEN; i++)
    buf1e4.toString('ascii');
});

timer('hex - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buf1e2.toString('hex');
});

timer('hex - 1e4', function() {
  for (var i = 0; i < LEN; i++)
    buf1e4.toString('hex');
});

timer('base64 - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buf1e2.toString('base64');
});

timer('base64 - 1e4', function() {
  for (var i = 0; i < LEN; i++)
    buf1e4.toString('base64');
});

timer('ucs2 - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buf1e2.toString('ucs2');
});

timer('ucs2 - 1e4', function() {
  for (var i = 0; i < LEN; i++)
    buf1e4.toString('ucs2');
});
