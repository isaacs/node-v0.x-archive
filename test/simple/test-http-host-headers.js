
var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    common = require('../common'),
    assert = require('assert'),
    options = {
        key: fs.readFileSync(common.fixturesDir + '/keys/agent1-key.pem'),
        cert: fs.readFileSync(common.fixturesDir + '/keys/agent1-cert.pem')
    },
    httpServer = http.createServer(reqHandler),
    httpsServer = https.createServer(options, reqHandler);

function reqHandler(req, res) {
  console.log('Got request: '+req.headers.host+' '+req.url);
  assert.equal(req.headers.host, 'localhost:'+common.PORT,
               'Wrong host header for req[' + req.url + ']: '+
               req.headers.host);
  res.writeHead(200, {});
  process.nextTick(function () { res.end('ok'); });
}

function thrower(er) {
  throw er;
}

testHttp();

function testHttp () {

  console.log('testing http on port '+common.PORT);

  var counter = 0;

  function cb() {
    counter --;
    console.log('back from http request. counter = '+counter);
    if (counter === 0) {
      httpServer.close();
      testHttps();
    }
  }

  httpServer.listen(common.PORT);

  http.get({ method:'GET',
             path: '/' + (counter ++),
             host: 'localhost',
             port: common.PORT }, cb).on('error', thrower);

  http.request({ method:'GET',
                 path: '/' + (counter ++),
                 host: 'localhost',
                 port: common.PORT }, cb).on('error', thrower);

  http.request({ method:'POST',
                 path: '/' + (counter ++),
                 host: 'localhost',
                 port: common.PORT }, cb).on('error', thrower);

  http.request({ method:'PUT',
                 path: '/' + (counter ++),
                 host: 'localhost',
                 port: common.PORT }, cb).on('error', thrower);

  http.request({ method:'DELETE',
                 path: '/' + (counter ++),
                 host: 'localhost',
                 port: common.PORT }, cb).on('error', thrower);

}

function testHttps() {

  console.log('testing https on port ' + common.PORT);

  var counter = 0;

  function cb() {
    counter --;
    console.log('back from https request. counter = '+counter);
    if (counter === 0) {
      httpsServer.close();
      console.log('ok');
    }
  }

  httpsServer.listen(common.PORT);

  https.get({ method:'GET',
              path: '/' + (counter ++),
              host: 'localhost',
              port: common.PORT }, cb).on('error', thrower);

  https.request({ method:'GET',
                  path: '/' + (counter ++),
                  host: 'localhost',
                  port: common.PORT }, cb).on('error', thrower);

  https.request({ method:'POST',
                  path: '/' + (counter ++),
                  host: 'localhost',
                  port: common.PORT }, cb).on('error', thrower);

  https.request({ method:'PUT',
                  path: '/' + (counter ++),
                  host: 'localhost',
                  port: common.PORT }, cb).on('error', thrower);

  https.request({ method:'DELETE',
                  path: '/' + (counter ++),
                  host: 'localhost',
                  port: common.PORT }, cb).on('error', thrower);
}
