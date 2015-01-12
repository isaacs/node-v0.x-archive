var fs = require('fs');
var path = require('path');
var common = require('../common.js');
var packageJson = '{"main": "index.js"}';

var tmpDirectory = path.join(__dirname, '..', 'tmp');
var benchmarkDirectory = path.join(tmpDirectory, 'nodejs-benchmark-module');

var bench = common.createBenchmark(main, {
  thousands: [50]
});

function main(conf) {
  rmrf(tmpDirectory);
  try { fs.mkdirSync(tmpDirectory); } catch (e) {}
  try { fs.mkdirSync(benchmarkDirectory); } catch (e) {}

  var n = +conf.thousands * 1e3;
  for (var i = 0; i <= n; i++) {
    fs.mkdirSync(benchmarkDirectory + i);
    fs.writeFileSync(benchmarkDirectory + i + '/package.json', '{"main": "index.js"}');
    fs.writeFileSync(benchmarkDirectory + i + '/index.js', 'module.exports = "";');
  }

  measure(n);
}

function measure(n) {
  bench.start();
  for (var i = 0; i <= n; i++) {
    require(benchmarkDirectory + i);
  }
  bench.end(n / 1e3);
}

function rmrf(location) {
  if (fs.existsSync(location)) {
    var things = fs.readdirSync(location);
    things.forEach(function(thing) {
      var cur = path.join(location, thing),
          isDirectory = fs.statSync(cur).isDirectory();
      if (isDirectory) {
        rmrf(cur);
        return;
      }
      fs.unlinkSync(cur);
    });
    fs.rmdirSync(location);
  }
}
