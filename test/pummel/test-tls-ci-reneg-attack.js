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
var spawn = require('child_process').spawn;
var tls = require('tls');
var fs = require('fs');

// renegotiation limits to test
var LIMITS = [0, 1, 2, 3, 5, 10, 16];

if (process.platform === 'win32') {
  console.log("Skipping test, you probably don't have openssl installed.");
  process.exit();
}

(function() {
  var n = 0;
  function next() {
    if (n >= LIMITS.length) return;
    tls.TLS_CLIENT_RENEG_LIMIT = LIMITS[n++];
    test(next);
  }
  next();
})();

function test(next) {
  var options = {
    cert: fs.readFileSync(common.fixturesDir + '/test_cert.pem'),
    key: fs.readFileSync(common.fixturesDir + '/test_key.pem')
  };

  var server = tls.createServer(options, function(conn) {
    conn.on('error', function(err) {
      console.error('Caught exception: ' + err);
      assert(/TLS session renegotiation attack/.test(err));
      conn.destroy();
    });
    conn.pipe(conn);
  });

  server.listen(common.PORT, function() {
    var args = ('s_client -connect 127.0.0.1:' + common.PORT).split(' ');
    var child = spawn('openssl', args);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    // count handshakes, start the attack after the initial handshake is done
    var handshakes = 0;
    child.stderr.on('data', function(data) {
      handshakes += (('' + data).match(/verify return:1/g) || []).length;
      if (handshakes === 2) spam();
    });

    var exited = false;
    child.on('exit', function() {
      // TLS_CLIENT_RENEG_LIMIT + 1 because the start of the last renegotiation
      // is logged (and therefore counted), +2 for the initial handshake
      if (tls.TLS_CLIENT_RENEG_LIMIT <= 1)
        assert.equal(handshakes, 4);
      else
        assert.equal(handshakes, 2 * tls.TLS_CLIENT_RENEG_LIMIT);
      server.close();
      exited = true;
      process.nextTick(next);
    });

    // simulate renegotiation attack
    function spam() {
      if (exited) return;
      child.stdin.write("R\n");
      setTimeout(spam, 250);
    }
  });
}
