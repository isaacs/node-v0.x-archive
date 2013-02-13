var common = require('../common.js');
var PORT = common.PORT;

var bench = common.createBenchmark(main, {
  type: ['bytes', 'buffer'],
  length: [4, 1024, 102400],
  c: [50, 150]
});

function main(conf) {
  process.env.PORT = PORT;
  var spawn = require('child_process').spawn;
  var simple = require('path').resolve(__dirname, '../http_simple.js');
  var server = spawn(process.execPath, [simple]);
  setTimeout(function() {
    var path = '/' + conf.type + '/' + conf.length; //+ '/' + conf.chunks;
    var args = ['-t', '5S', '-c', conf.c];

    bench.siege(path, args, function() {
      server.kill();
    });
  }, 2000);
}
