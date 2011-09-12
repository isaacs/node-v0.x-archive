// not much here yet in the way of actual tests,
// just make sure it loads.

var z = require('zlib');
var df = new z.Deflate(-1, 15, 8, 0);

console.error("created df", df)

df.onData = function (c) {
  console.error('onData', c.toString("hex").substr(0, 50));
};
df.onEnd = function () {
  console.error('onEnd');
};

console.error("assigned handlers");

process.nextTick(function () {
df.write(new Buffer("hello"))
var e = Date.now() + 100
  , worlds = ""
while (Date.now() < e) {
  worlds += " world"
  df.write(new Buffer(worlds))
}
console.error("did writes")
df.end(new Buffer("!"))
console.error("did end")
})
