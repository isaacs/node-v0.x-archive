var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var active = null;
var cntr = 0;

function onAsync0() {
  return 0;
}

function onAsync1() {
  return 1;
}

function onError(stor) {
  results.push(stor);
  return true;
}

var results = [];
var asyncNoHandleError0 = {
  create: onAsync0,
  error: onError
};
var asyncNoHandleError1 = {
  create: onAsync1,
  error: onError
};

var listeners = [
  tracing.addAsyncListener(asyncNoHandleError0),
  tracing.addAsyncListener(asyncNoHandleError1)
];

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

  // Handling of errors should propagate to all listeners.
  assert.equal(results[0], 0);
  assert.equal(results[1], 1);
  assert.equal(results.length, 2);

  console.log('ok');
});
