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
 * --len: how many itterations each test should run (default: 1e7)
 * --type: whether to use a 'fast' or 'slow' buffer (default: fast)
 * --noassert: enable noAssert (default: false)
 *
 * Example:
 *
 *   node buffer_write.js --run writeUInt8 --len 1e5 --type slow --noassert true
 */

const INT8   = 0x7f;
const INT16  = 0x7fff;
const INT32  = 0x7fffffff;
const UINT8  = INT8 * 2;
const UINT16 = INT16 * 2;
const UINT32 = INT32 * 2;

var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var Buff = parsed.type == 'slow' ? require('buffer').SlowBuffer : Buffer;
var noAssert = parsed.noassert == 'true' ? true : false;
var LEN = parsed.len || 1e6;
var buff = Buff(8);

timer('writeUInt8', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeUInt8(i % UINT8, 0, noAssert);
  }
});

timer('writeUInt16LE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeUInt16LE(i % UINT16, 0, noAssert);
  }
});

timer('writeUInt16BE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeUInt16BE(i % UINT16, 0, noAssert);
  }
});

timer('writeUInt32LE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeUInt32LE(i % UINT32, 0, noAssert);
  }
});

timer('writeUInt32BE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeUInt32BE(i % UINT32, 0, noAssert);
  }
});

timer('writeInt8', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeInt8(i % INT8, 0, noAssert);
  }
});

timer('writeInt16LE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeInt16LE(i % INT16, 0, noAssert);
  }
});

timer('writeInt16BE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeInt16BE(i % INT16, 0, noAssert);
  }
});

timer('writeInt32LE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeInt32LE(i % INT32, 0, noAssert);
  }
});

timer('writeInt32BE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeInt32BE(i % INT32, 0, noAssert);
  }
});

timer('writeFloatLE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeFloatLE(i * 0.1, 0, noAssert);
  }
});

timer('writeFloatBE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeFloatBE(i * 0.1, 0, noAssert);
  }
});

timer('writeDoubleLE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeDoubleLE(i * 0.1, 0, noAssert);
  }
});

timer('writeDoubleBE', function() {
  for (i = 0; i < LEN; i++) {
    buff.writeDoubleBE(i * 0.1, 0, noAssert);
  }
});
