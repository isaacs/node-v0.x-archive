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
var Buffer = require('buffer').Buffer;
var dgram = require('dgram');

var testsRun = 0;
var expectTests = 0;
var actualPings = 0;
var expectPings = 0;

var N = 50;

function pingPongTest(port, host) {
  expectTests++;
  expectPings += N;
  var callbacks = 0;
  var count = 0;
  var sentFinalPing = false;

  // Sometimes it times out.
  var timer = setTimeout(function() {
    console.error('Timeout!');
    server.close();
    process.exit(1);
  }, 5000);


  var server = dgram.createSocket('udp4', function(msg, rinfo) {
    console.log('SERVER recv', rinfo.port, rinfo.address, msg.toString());
    assert.equal('PING', msg.toString('ascii'));
    actualPings += 1;
    var buf = new Buffer('PONG');
    console.log('SERVER send', rinfo.port, rinfo.address, buf.toString());
    server.send(buf, 0, buf.length,
                rinfo.port, rinfo.address,
                function(err, sent) {
                  callbacks++;
                });
  });

  server.on('error', function(e) {
    throw e;
  });

  server.on('listening', function() {
    console.log('server listening on ' + port + ' ' + host);

    var buf = new Buffer('PING'),
        client = dgram.createSocket('udp4');

    client.on('message', function(msg, rinfo) {
      console.log('CLIENT recv', rinfo.port, rinfo.address, msg.toString());
      assert.equal('PONG', msg.toString('ascii'));

      if (count < N) {
        count += 1;
        console.log('CLIENT send', port, 'localhost', buf.toString(), count);
        client.send(buf, 0, buf.length, port, 'localhost', function(err, b) {
          if (err) {
            throw err;
          }

          console.log('  CLIENT sent %d bytes', b);
        });

      } else {
        sentFinalPing = true;
        client.send(buf, 0, buf.length, port, 'localhost', function() {
          console.log('Closing client', port);
          client.close();
        });
      }
    });

    client.on('close', function() {
      console.log('client has closed, closing server');
      assert.equal(N, count);
      testsRun += 1;
      server.close();
      assert.equal(N, callbacks);
      clearTimeout(timer);
    });

    client.on('error', function(e) {
      throw e;
    });

    console.log('Client send to ' + port + ', localhost ' + buf);
    client.send(buf, 0, buf.length, port, 'localhost', function(err, bytes) {
      if (err) {
        throw err;
      }
      console.log('Client sent ' + bytes + ' bytes');
    });
    count += 1;
  });
  server.bind(port, host);
}

// All are run at once, so run on different ports
pingPongTest(20989, 'localhost');
pingPongTest(20990, 'localhost');
pingPongTest(20988);
//pingPongTest('/tmp/pingpong.sock');

process.on('exit', function() {
  console.error('Expect Pings: %d', expectPings);
  console.error('Actual Pings: %d', actualPings);
  console.error('Percentage:', Math.round(100 * actualPings/expectPings));

  assert.equal(expectTests, testsRun);
  console.log('done');
});
