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
 * --noassert: enable noAssert (default: false)
 *
 * Example:
 *
 *   node buffer_read.js --run readUInt8 --len 1e5 --type slow --noassert true
 */

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var noAssert = parsed.noassert == 'true' ? true : false;
var LEN = parsed.len || 1e6;
var buff = Buff(8);

buff.fill(0, 0, buff.length);

timer('readUInt8', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readUInt8(0, noAssert);
  }
});

timer('readUInt16LE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readUInt16LE(0, noAssert);
  }
});

timer('readUInt16BE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readUInt16BE(0, noAssert);
  }
});

timer('readUInt32LE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readUInt32LE(0, noAssert);
  }
});

timer('readUInt32BE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readUInt32BE(0, noAssert);
  }
});

timer('readInt8', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readInt8(0, noAssert);
  }
});

timer('readInt16LE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readInt16LE(0, noAssert);
  }
});

timer('readInt16BE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readInt16BE(0, noAssert);
  }
});

timer('readInt32LE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readInt32LE(0, noAssert);
  }
});

timer('readInt32BE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readInt32BE(0, noAssert);
  }
});

timer('readFloatLE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readFloatLE(0, noAssert);
  }
});

timer('readFloatBE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readFloatBE(0, noAssert);
  }
});

timer('readDoubleLE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readDoubleLE(0, noAssert);
  }
});

timer('readDoubleBE', function() {
  for (var i = 0; i < LEN; i++) {
    buff.readDoubleBE(0, noAssert);
  }
});
