// nothing here yet, just make sure it loads.

var z = require('zlib');
var df = new z.Deflate(-1);

df.onData = function (c) {
  console.error('onData', c.toString("hex"));
};
df.onEnd = function () {
  console.error('onEnd');
};

df.write(new Buffer("hello"))
df.write(new Buffer(" world"))
df.write(new Buffer(" world"))
df.write(new Buffer(" world"))
df.write(new Buffer(" world"))
df.write(new Buffer(" world"))
df.write(new Buffer(" world"))
df.end(new Buffer("!"))
