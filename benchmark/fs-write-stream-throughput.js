var dur = +process.argv[2] || 10;
var size = +process.argv[3] || 2;
var chunk = new Array(size + 1).join('a');
var writes = 0;
var fs = require('fs');
try { fs.unlinkSync('write_stream_throughput'); } catch (e) {}

var start
var end;
function done() {
  var time = end[0] + end[1]/1E9;
  var written = fs.statSync('write_stream_throughput').size / 1024;
  var rate = (written / time).toFixed(2);
  console.log('fs_write_stream_dur%d_size%d %d', dur, size, rate);

  // uncomment to show the close overhead.  should be ~0.01 seconds on both
  // streams2 and streams1 implementations.
  // var close = process.hrtime([start[0] + end[0], start[1] + end[1]]);
  // console.error('    %d', close[0] + close[1]/1e9);

  try { fs.unlinkSync('write_stream_throughput'); } catch (e) {}
}

var f = require('fs').createWriteStream('write_stream_throughput');
f.on('drain', write);
f.on('open', write);
f.on('close', done);

// streams2 fs.WriteStreams will let you send a lot of writes into the
// buffer before returning false, so capture the *actual* end time when
// all the bytes have been written to the disk, indicated by 'finish'
f.on('finish', function() {
  end = process.hrtime(start);
});

var ending = false;
function write() {
  // don't try to write after we end, even if a 'drain' event comes.
  // v0.8 streams are so sloppy!
  if (ending)
    return;

  start = start || process.hrtime();
  while (false !== f.write(chunk));
  end = process.hrtime(start);

  if (end[0] >= dur) {
    ending = true;
    f.end();
  }
}
