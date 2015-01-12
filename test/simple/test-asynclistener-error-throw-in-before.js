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
    // Error handler must be called exactly *once*.
    once++;
    assert.equal(err, 1);
    return true;
  }
}

var key = tracing.addAsyncListener(handlers);

var uncaughtFired = false;
process.on('uncaughtException', function(err) {
  uncaughtFired = true;

  // Process should propagate error regardless of handlers return value.
  assert.equal(once, 1);
});

process.nextTick(function() { });

tracing.removeAsyncListener(key);

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  // Make sure that the uncaughtException actually fired.
  assert.ok(uncaughtFired);
  console.log('ok');
});
