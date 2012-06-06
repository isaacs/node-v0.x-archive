var http = require('http');
var net = require('net');

var server = net.createServer(function(sock) {
  sock.end(
    'HTTP/1.1 200 OK\r\n' +
    'Date: ' + new Date().toUTCString() + '\r\n' +
    'Content-Length: 1\r\n' +  // wrong length
    'Content-Type: text/plain\r\n' +
    '\r\n' +
    '\r\n' +
    'This is too long.\r\n' +
    '\r\n' +
    '\r\n');
  sock.destroySoon();
  server.close();
});

server.listen(1337);

var options = { host: 'localhost',
                port: 1337,
                path: '/',
                method: 'HEAD' };

var req = http.request(options, function (res) {
  req.hadResponse = true;
  res.hadResponse = true;
  console.error('response:', res.statusCode, res.headers);

  res.on('error', function(error) {
    console.error('res error', error);
  });

  req.on('error', function(error) {
    console.error('req error', error);
  });

  res.socket.on('error', function(error) {
    console.error('socket error', error);
  });
});


req.end();
