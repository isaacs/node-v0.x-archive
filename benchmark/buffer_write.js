const INT8   = 0x7f;
const INT16  = 0x7fff;
const INT32  = 0x7fffffff;
const UINT8  = INT8 * 2;
const UINT16 = INT16 * 2;
const UINT32 = INT32 * 2;

var timer = require('bench-timer');
var params = timer.parse(process.argv);

var ITER = params.iter || 1e7;
var noAssert = params.noassert;
var Buff = params.slow ? require('buffer').SlowBuffer : Buffer;
var buff = Buff(8);

timer('writeUInt8', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeUInt8(i % UINT8, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeUInt16LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeUInt16LE(i % UINT16, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeUInt16BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeUInt16BE(i % UINT16, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeUInt32LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeUInt32LE(i % UINT32, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeUInt32BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeUInt32BE(i % UINT32, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeInt8', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeInt8(i % INT8, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeInt16LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeInt16LE(i % INT16, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeInt16BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeInt16BE(i % INT16, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeInt32LE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeInt32LE(i % INT32, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeInt32BE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeInt32BE(i % INT32, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeFloatLE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeFloatLE(i * 0.1, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeFloatBE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeFloatBE(i * 0.1, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeDoubleLE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeDoubleLE(i * 0.1, 0, noAssert);
}).oncomplete(oncomplete, ITER);

timer('writeDoubleBE', function() {
  for (var i = 0; i < ITER; i++)
    buff.writeDoubleBE(i * 0.1, 0, noAssert);
}).oncomplete(oncomplete, ITER);


function oncomplete(name, hrtime, iter) {
  var t = hrtime[0] * 1e3 + hrtime[1] / 1e6;
  var m = timer.maxNameLength();
  name += ': ';
  while (name.length < m + 2)
    name += ' ';
  console.log('%s%s/ms', name, Math.floor(iter / t));
}
