// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common');
var assert = require('assert');

var stream = require('stream');
var Readable = stream.Readable;
var Writable = stream.Writable;

var r = new Readable({ highWaterMark: 1000 });
var chunks = 100;
r._read = function(n) {
  if (!(chunks % 2))
    setImmediate(push);
  else if (!(chunks % 3))
    process.nextTick(push);
  else
    push();
};

var totalPushed = 0;
function push() {
  var chunk = chunks-- > 0 ? new Buffer(99) : null;
  if (chunk) {
    totalPushed += chunk.length;
    chunk.fill('x');
  }
  r.push(chunk);
}

read100();

// first we read 100 bytes
function read100() {
  console.error('read 100');
  var c = r.read(100);
  if (!c)
    r.once('readable', read100);
  else {
    assert.equal(c.length, 100);
    assert(!r._readableState.flowing);
    onData();
  }
}

// then we listen to some data events
function onData() {
  console.error('onData');
  var seen = 0;
  r.on('data', function od(c) {
    seen += c.length;
    if (seen >= 100) {
      // seen enough
      r.removeListener('data', od);
      r.pause();
      if (seen > 100) {
        // oh no, seen too much!
        // put the extra back.
        var diff = seen - 100;
        r.unshift(c.slice(c.length - diff));
        console.error('seen too much', seen, diff);
      }

      // Nothing should be lost in between
      setImmediate(pipeLittle);
    }
  });
}

// Just pipe 200 bytes, then unshift the extra and unpipe
function pipeLittle() {
  console.error('pipe a little');
  var w = new Writable();
  var written = 0;
  w.on('finish', function() {
    assert.equal(written, 200);
    setImmediate(pipe);
  });
  w._write = function(chunk, encoding, cb) {
    written += chunk.length;
    if (written >= 200) {
      r.unpipe(w);
      w.end();
      cb();
      if (written > 200) {
        var diff = written - 200;
        written -= diff;
        r.unshift(chunk.slice(chunk.length - diff));
      }
    } else {
      setImmediate(cb);
    }
  };
  r.pipe(w);
}

function pipe() {
  console.error('pipe the rest');
  var w = new Writable();
  var written = 0;
  w._write = function(chunk, encoding, cb) {
    written += chunk.length;
    cb();
  };
  w.on('finish', function() {
    console.error('written', written, totalPushed);
    assert.equal(written, totalPushed - 400);
    console.log('ok');
  });
  r.pipe(w);
}
