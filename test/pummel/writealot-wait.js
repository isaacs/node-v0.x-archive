var fs = require("fs");
var child_process = require("child_process");
var assert = require("assert");
var fd = fs.openSync("out.txt", "w");
var i = 0;
var data = "";
while (i ++ < 80) data += "a";
data += "\n";
var buffer = new Buffer(data);


;(function LOOP (i, l) {
  fs.write(fd, buffer, 0, data.length, null, function (er, w, obj) {
    if (obj) {
      var b = obj.buffer;
      assert.equal(b, buffer);
      testBuffer(b);
    }
    if (i < l) LOOP(i+1, l);
    else done();
  })
})(0, 1024);
//
//for (var i = 0; i < 500; i ++) fs.write(fd, buffer, 0, data.length, null, function (er, w, obj) {
//  var b = obj.buffer;
//  assert.equal(b, buffer)
//  testBuffer(b)
//});
function testBuffer (b) {
  for (var i = 0, l = b.length; i < l; i ++) {
    if (b[i] !== 97 && b[i] !== 10) {
      throw new Error("invalid char "+i+","+b[i]);
    }
  }
}
function done () { 
  setTimeout(function () {
    fs.createReadStream("out.txt")
      .on("data", function (chunk) {
        testBuffer(chunk)
      })
  }, 2000);
}

