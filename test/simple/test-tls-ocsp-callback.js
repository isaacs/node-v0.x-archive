var common = require('../common');

if (!process.features.tls_ocsp) {
  console.error('Skipping because node compiled without OpenSSL or ' +
                'with old OpenSSL version.');
  process.exit(0);
}
if (!common.opensslCli) {
  console.error('Skipping because node compiled without OpenSSL CLI.');
  process.exit(0);
}

test({ response: false }, function() {
  test({ response: 'hello world' });
});

function test(testOptions, cb) {
  var assert = require('assert');
  var tls = require('tls');
  var fs = require('fs');
  var join = require('path').join;
  var spawn = require('child_process').spawn;

  var keyFile = join(common.fixturesDir, 'keys', 'agent1-key.pem');
  var certFile = join(common.fixturesDir, 'keys', 'agent1-cert.pem');
  var caFile = join(common.fixturesDir, 'keys', 'ca1-cert.pem');
  var key = fs.readFileSync(keyFile);
  var cert = fs.readFileSync(certFile);
  var ca = fs.readFileSync(caFile);
  var options = {
    key: key,
    cert: cert,
    ca: [ca]
  };
  var requestCount = 0;
  var ocspCount = 0;
  var ocspResponse;
  var session;

  var server = tls.createServer(options, function(cleartext) {
    cleartext.on('error', function(er) {
      // We're ok with getting ECONNRESET in this test, but it's
      // timing-dependent, and thus unreliable. Any other errors
      // are just failures, though.
      if (er.code !== 'ECONNRESET')
        throw er;
    });
    ++requestCount;
    cleartext.end();
  });
  server.on('OCSPRequest', function(cert, issuer, callback) {
    ++ocspCount;
    assert.ok(Buffer.isBuffer(cert));
    assert.ok(Buffer.isBuffer(issuer));

    // Just to check that async really works there
    setTimeout(function() {
      callback(null,
               testOptions.response ? new Buffer(testOptions.response) : null);
    }, 100);
  });
  server.listen(common.PORT, function() {
    var client = tls.connect({
      port: common.PORT,
      requestOCSP: true,
      rejectUnauthorized: false
    }, function() {
    });
    client.on('OCSPResponse', function(resp) {
      ocspResponse = resp;
      if (resp)
        client.destroy();
    });
    client.on('close', function() {
      server.close(cb);
    });
  });

  process.on('exit', function() {
    if (testOptions.response) {
      assert.equal(ocspResponse.toString(), testOptions.response);
    } else {
      assert.ok(ocspResponse === null);
    }
    assert.equal(requestCount, testOptions.response ? 0 : 1);
    assert.equal(ocspCount, 1);
  });
}
