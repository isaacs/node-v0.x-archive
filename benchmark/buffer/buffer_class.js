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
 *   node buffer_class.js --run 'byteLength - ascii' --len 1e5 --type slow
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var LEN = parsed.len || 1e6;
var str = createString(1e3);

timer('isBuffer - {}', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.isBuffer({});
});

timer('byteLength - utf8', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.byteLength(str, 'utf8');
});

timer('byteLength - ascii', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.byteLength(str, 'ascii');
});

timer('byteLength - hex', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.byteLength(str, 'hex');
});

timer('byteLength - ucs2', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.byteLength(str, 'ucs2');
});

timer('byteLength - base64', function() {
  for (var i = 0; i < LEN; i++)
    Buffer.byteLength(str, 'base64');
});


function createString(len) {
  var str = '\u2803';
  while (str.length * 2 <= len)
    str += str;
  str += str.substr(0, len - str.length);
  return str;
}
