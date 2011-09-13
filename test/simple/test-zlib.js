// not much here yet in the way of actual tests,
// just make sure it loads.

var z = require('zlib');
var df = new z.Gzip();
var inf = new z.Gunzip();
var events = require("events");

df.pipe(inf);

df.on("data", function (c) {
  console.error("deflated data", c.length);
});

df.on("end", function () {
  console.error("deflated end");
});

inf.on('data', function (c) {
  process.stdout.write(c);
});

inf.on('end', function () {
  console.error("inflated end");
});

console.error("assigned handlers");

df.write(new Buffer("start"), function () {})
var e = 1000
  , worlds = " hello world " + e
while (e --> 0) {
  worlds += " world " + e
  df.write(worlds + "\n")
  console.error("wrote %s", worlds);
  //console.log(new Buffer(worlds).toString())
}
console.error("max world len = "+worlds.length);
console.error("did writes")
df.end("\n---\nend", function (){})
console.error("did end")
