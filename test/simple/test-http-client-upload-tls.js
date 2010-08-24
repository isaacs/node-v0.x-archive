
MIMIC_SLOW_SERVER = global.MIMIC_SLOW_SERVER || false;

var common = require('../common');
var assert = require('assert');
var fixturesDir = common.fixturesDir;
var net = require('net');
var http = require('http');
var url = require('url');
var qs = require('querystring');
var fs = require('fs');
var sys = require('sys');

var have_openssl;
try {
  var crypto = require('crypto');
  var dummy_server = http.createServer(function(){});
  dummy_server.setSecure();
  have_openssl=true;
} catch (e) {
  have_openssl=false;
  console.error('Not compiled with OPENSSL support.');
  process.exit();
}

var caPem = fs.readFileSync(fixturesDir+'/test_ca.pem', 'ascii');
var certPem = fs.readFileSync(fixturesDir+'/test_cert.pem', 'ascii');
var keyPem = fs.readFileSync(fixturesDir+'/test_key.pem', 'ascii');

var credentials = crypto.createCredentials({key:keyPem, cert:certPem, ca:caPem});

var https_server = http.createServer(function (req, res) {
  console.error('       SERVER: got connection');
  var verified = res.connection.verifyPeer();
  var peerDN = JSON.stringify(req.connection.getPeerCertificate());
  assert.equal(verified, true);
  assert.equal(peerDN, '{"subject":"/C=UK/ST=Acknack Ltd/L=Rhys Jones'
      + '/O=node.js/OU=Test TLS Certificate/CN=localhost",'
      + '"issuer":"/C=UK/ST=Acknack Ltd/L=Rhys Jones/O=node.js'
      + '/OU=Test TLS Certificate/CN=localhost","valid_from":'
      + '"Nov 11 09:52:22 2009 GMT","valid_to":'
      + '"Nov  6 09:52:22 2029 GMT"}');

  var data = '';
  var wait = 0;
  req.setEncoding('utf8');
  var connected = true;
  var chunkNumber = 0;
  var bytesReceived = 0;
  req.on('data', function (chunk) {
    console.error('       SERVER: chunk #%d, %d% received',
      chunkNumber ++,
      Math.round(bytesReceived/totalUpload*100));
    bytesReceived += chunk.length;
    if (!MIMIC_SLOW_SERVER) return;

    req.pause();
    // console.error('       SERVER: wait for %dms', wait);
    wait += 5;
    setTimeout(function () {
      if (!connected) return;
      try {
        req.resume()
      } catch (ex) {
        console.error('server failed to resume.');
        throw ex;
      }
    }, wait);
  });
  req.on('end', function () {
    connected = false;
    res.writeHead(200, {'content-type':'text/plain'})
    res.end(''+bytesReceived);
  });
});
https_server.setSecure(credentials);
https_server.listen(common.PORT);

var c = http.createClient(common.PORT);
c.setEncoding('utf8');
c.setSecure(credentials);

var upload_data = '';

// create 1MB of random letters

var req = c.request('POST', '/');
// pump up to the server in 16kb chunks.
var pos = 0;
var chunkSize = 1024 * 16;
var chunksToSend = 1024;
var chunkNumber = 0;
var chunk = '';
for (var i = 0; i < chunkSize; i ++) {
  chunk += String.fromCharCode(Math.random() * 26 + 97);
}

var totalUpload = chunkSize * chunksToSend ;
var takingTooLong = null;
;(function PUMP () {
  console.error('CLIENT: chunk #%d, %d% sent',
    chunkNumber ++,
    Math.round(chunkNumber / chunksToSend * 100));
  if (chunkNumber === chunksToSend) {
    req.end(chunk);
    clearTimeout(takingTooLong);
    takingTooLong = setTimeout(function () {
      throw new Error('Frozed!');
    }, 10000);
    return;
  }
  if (!req.write(chunk)) {
    req.on('drain', function DRAIN () {
      req.removeListener('drain', DRAIN);
      PUMP();
    });
  } else {
    process.nextTick(PUMP);
  }
})();

req.on('response', function (res) {
  clearTimeout(takingTooLong);
  res.setEncoding('utf8');
  res.addListener('data', function(chunk) {
    console.error(chunk);
  });
  res.addListener('end', function() {
    console.error('CLIENT: end event');
    client_res_complete = true;
    https_server.close();
  });
});

process.on('exit', function () {
  assert.ok(client_res_complete, 'Client response should complete');
})


  