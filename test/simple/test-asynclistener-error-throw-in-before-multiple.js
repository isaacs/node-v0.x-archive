var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var once = 0;

var results = [];
var handlers = {
  before: function() {
    throw 1;
  },
  error: function(stor, err) {
    // Must catch error thrown in before callback.
    assert.equal(err, 1);
    once++;
    return true;
  }
}

var handlers1 = {
  before: function() {
    throw 2;
  },
  error: function(stor, err) {
    // Must catch *other* handlers throw by error callback.
    assert.equal(err, 1);
    once++;
    return true;
  }
}

var listeners = [
  tracing.addAsyncListener(handlers),
  tracing.addAsyncListener(handlers1)
];

var uncaughtFired = false;
process.on('uncaughtException', function(err) {
  uncaughtFired = true;

  // Both error handlers must fire.
  assert.equal(once, 2);
});

process.nextTick(function() { });

for (var i = 0; i < listeners.length; i++)
  tracing.removeAsyncListener(listeners[i]);

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;
  // Make sure uncaughtException actually fired.
  assert.ok(uncaughtFired);
  console.log('ok');
});

