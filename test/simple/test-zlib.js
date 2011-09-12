// not much here yet in the way of actual tests,
// just make sure it loads.

var z = require('zlib');
var df = new z.DeflateRaw(0, -1, 15, 8, 0);
var inf = new z.InflateRaw(0, -1, 15);

console.error("created df", df)

df.onData = function (c) {
  inf.write(c, function () {});
};
df.onEnd = function () {
  console.error('df onEnd');
  inf.end(function () {});
};

inf.onData = function (c) {
  //process.stdout.write(c);
  console.error('has null',
                c.toString().indexOf("\u0000"),
                c.length);
  if (c.toString().indexOf("\u0000")) {
    console.log(JSON.stringify(c.toString()))
  }
}
inf.onEnd = function () {
  console.error("inflated end");
}

console.error("assigned handlers");

df.write(new Buffer("hello"), function () {})
var e = Date.now() + 100
  , worlds = " hello world"
while (Date.now() < e) {
  //worlds += " world"
  df.write(new Buffer(worlds), function () {})
  //console.log(new Buffer(worlds).toString())
}
console.error("did writes")
df.end(new Buffer(" hello world "), function (){})
console.error("did end")
