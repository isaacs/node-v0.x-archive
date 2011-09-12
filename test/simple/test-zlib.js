// not much here yet in the way of actual tests,
// just make sure it loads.

var z = require('zlib');
var df = new z.Deflate(0, -1, 15, 8, 0);
var inf = new z.Inflate(0, -1, 15);

console.error("created df", df)

df.onData = function (c) {
  inf.write(c);
};
df.onEnd = function () {
  console.error('df onEnd');
  inf.end();
};

inf.onData = function (c) {
  console.error("inflated",
                JSON.stringify(c.toString().substr(0, 50)));
}
inf.onEnd = function () {
  console.error("inflated end");
}

console.error("assigned handlers");

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
