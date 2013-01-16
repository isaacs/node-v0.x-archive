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
 *   node buffer_write_string.js --run 'write - 1e1' --len 1e5 --type slow
 *
 * Defaults are 'fast' and '1e6'.
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var LEN = parsed.len || 1e6;
var buff = Buff(1e4);
var str1e1 = createString(1e1);
var str1e2 = createString(1e2);
var str1e3 = createString(1e3);

timer('write - 1e1', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e1);
});

timer('write - 1e1@1e3', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e1, 1e3);
});

timer('write - 1e2', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e2);
});

timer('write - 1e2@1e3', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e2, 1e3);
});

timer('write - 1e3', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e3);
});

timer('write - 1e3@1e3', function() {
  for (var i = 0; i < LEN; i++)
    buff.write(str1e3, 1e3);
});


function createString(len) {
  var str = 'a';
  while (str.length * 2 <= len)
    str += str;
  str += str.substr(0, len - str.length);
  return str;
}
