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
 *   node events_listeners.js --run 'add names' --len 1e5
 */

var EventEmitter = require('events').EventEmitter;
var timer = require('../_bench_timer');
var parsed = timer.parse(process.argv);
var LEN = parsed.len || 1e6;

(function() {
  var emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  timer('add names', function() {
    for (var i = 0; i < LEN; i++) {
      emitter.on('i', function() { });
    }
  });
}());

(function() {
  var emitter = new EventEmitter();
  var fn;
  timer('add remove', function() {
    for (var i = 0; i < LEN; i++) {
      fn = function() { };
      emitter.on('test', fn);
      emitter.removeListener('test', fn);
    }
  });
}());

(function() {
  var emitter = new EventEmitter();
  var fn = function() { };
  timer('add removeAll', function() {
    for (var i = 0; i < LEN; i++) {
      emitter.on('test', fn);
      emitter.removeAllListeners('test');
    }
  });
}());

(function() {
  var emitter = new EventEmitter();
  for (var i = 0; i < 10; i++)
    emitter.on('test', function() { });
  timer('listeners - 10', function() {
    for (var i = 0; i < LEN; i++) {
      emitter.listeners('test');
    }
  });
}());
