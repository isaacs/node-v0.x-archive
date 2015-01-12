var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

function onAsync0() {
  return 0;
}

function onAsync1() {
  return 1;
}

function onError(stor) {
  results.push(stor);
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

var uncaughtFired = false;
process.on('uncaughtException', function() {
  uncaughtFired = true;

  // Unhandled errors should propagate to all listeners.
  assert.equal(results[0], 0);
  assert.equal(results[1], 1);
  assert.equal(results.length, 2);
});

process.nextTick(function() {
  throw new Error();
});

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  // Need to remove the async listeners or tests will always pass
  for (var i = 0; i < listeners.length; i++)
    tracing.removeAsyncListener(listeners[i]);

  assert.ok(uncaughtFired);
  console.log('ok');
});
