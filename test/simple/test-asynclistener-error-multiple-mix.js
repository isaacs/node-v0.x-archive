var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var results = [];
var asyncNoHandleError = {
  error: function(stor) {
    results.push(1);
  }
};

var asyncHandleError = {
  error: function(stor) {
    results.push(0);
    return true;
  }
};

var listeners = [
  tracing.addAsyncListener(asyncHandleError),
  tracing.addAsyncListener(asyncNoHandleError)
];

// Even if an error handler returns true, both should fire.
process.nextTick(function() {
  throw new Error();
});

tracing.removeAsyncListener(listeners[0]);
tracing.removeAsyncListener(listeners[1]);

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  // Mixed handling of errors should propagate to all listeners.
  assert.equal(results[0], 0);
  assert.equal(results[1], 1);
  assert.equal(results.length, 2);

  console.log('ok');
});
