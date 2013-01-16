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

/* Usage:
 *
 * --run: specify which test(s) to run
 * --len: how many itterations each test should run (default: 1e6)
 *
 * Example:
 *
 *   node events_emit.js --run 'emit - 1 arg' --len 1e5
 */

var EventEmitter = require('events').EventEmitter;
var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var LEN = parsed.len || 1e6;

(function() {
  var emitter = new EventEmitter();
  emitter.on('test', function(msg) { });
  timer('emit - 1 arg 1 listener', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test', 'message');
  });
}());

(function() {
  var emitter = new EventEmitter();
  for (var i = 0; i < 10; i++)
    emitter.on('test', function(msg) { });
  timer('emit - 1 arg 10 listeners', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test', 'message');
  });
}());

(function() {
  var emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  for (var i = 0; i < 100; i++)
    emitter.on('test', function(msg) { });
  timer('emit - 1 arg 100 listeners', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test', 'message');
  });
}());

(function() {
  var emitter = new EventEmitter();
  emitter.on('test', function(a,b,c,d,e) { });
  timer('emit - 5 arg 1 listener', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test','a','b','c','d','e');
  });
}());

(function() {
  var emitter = new EventEmitter();
  for (var i = 0; i < 10; i++)
    emitter.on('test', function(a,b,c,d,e) { });
  timer('emit - 5 arg 10 listeners', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test','a','b','c','d','e');
  });
}());

(function() {
  var emitter = new EventEmitter();
  emitter.on('newListener', function() { });
  emitter.on('test', function(a) { });
  timer('emit - 1 newListener', function() {
    for (var i = 0; i < LEN; i++)
      emitter.emit('test','a');
  });
}());
