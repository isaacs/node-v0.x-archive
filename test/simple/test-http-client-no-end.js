var http = require('http');
var assert = require('assert');
var common = require('../common');

var gotRequest = false;
http.createServer(function(req, res) {
  console.log('Got request');
  gotRequest = true;
  req.writeHead(403, {});
  req.end('we dont want any!');
}).listen(common.PORT);

http.request({ method: 'GET',
  path: '/',
  host: 'localhost',
  port: common.PORT });

setTimeout(function() {
  assert.ok(gotRequest, 'did not get request');
}, 10);
