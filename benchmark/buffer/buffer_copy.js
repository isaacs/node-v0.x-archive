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
 *   node buffer_copy.js --run 'fill' --len 1e5 --type slow
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var LEN = parsed.len || 1e6;
var buf0 = Buff(1e3);
var buf1 = Buff(1e3);

buf0.fill(0x61, 0, buf0.length);
buf1.fill(0x62, 0, buf1.length);

timer('fill', function() {
  for (var i = 0; i < LEN; i++)
    buf0.copy(buf1);
});

timer('fill - seg', function() {
  for (var i = 0; i < LEN; i++)
    buf0.copy(buf1, 500);
});

timer('fill - same', function() {
  for (var i = 0; i < LEN; i++)
    buf0.copy(buf0);
});
