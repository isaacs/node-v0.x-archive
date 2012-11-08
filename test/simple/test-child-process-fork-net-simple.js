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

var assert = require('assert');
var common = require('../common');
var fork = require('child_process').fork;
var net = require('net');

if (process.argv[2] === 'child')
  child();
else
  parent();

function parent() {
  // create a server.
  // spawn a child
  // when the request comes in, send it to the child,
  // and close the server.
  // the child handles the request.
  // when the server closes, kill the child
  var child = fork(process.argv[1], ['child']);
  var server = net.createServer(function(socket) {
    child.send('connection', socket);
    server.close();
  });

  server.on('close', function() {
    console.error('PARENT: server emit close, killing child.');
    child.kill();
  });

  var closed = false;
  var data = null;
  var ended = false;
  var finished = false;

  server.listen(common.PORT, function() {
    var client = net.connect(common.PORT);
    client.on('close', function() {
      closed = true;
      console.error('CLIENT: close event in master');
    });
    client.on('data', function(c) {
      console.error('CLIENT: data %j', c);
      data = c;
    });
    client.on('end', function() {
      console.error('CLIENT: ended');
      ended = true;
    });
    client.on('finish', function() {
      console.error('CLIENT: finished');
      finished = true;
    });
    client.setEncoding('utf8');
    client.end('hello');
  });

  process.on('exit', function() {
    assert(data === 'hello');
    assert(ended);
    assert(closed);
    assert(finished);
    console.error('PARENT exit', {
      data: data,
      ended: ended,
      closed: closed,
      finished: finished
    });
  });
}

function child() {
  var data = null;
  var ended = false;
  var closed = false;
  var finished = false;

  process.on('message', function(m, socket) {
    if (!socket) return;
    // socket.pipe(socket);
    socket.end('hello');
    socket.on('close', function() {
      closed = true;
      console.error('CHILD: close event');
    });
    socket.on('end', function() {
      ended = true;
      console.error('CHILD: end event');
    });
    socket.on('finish', function() {
      finished = true;
      console.error('CHILD: finish event');
    });
    socket.on('readable', function() {
      console.trace('CHILD: readable event');
    });
    socket.on('_socketEnd', function() {
      console.error('CHILD: socketEnd');
    });
  });
}

