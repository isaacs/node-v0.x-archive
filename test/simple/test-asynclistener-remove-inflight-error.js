var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var set = 0;
var asyncNoHandleError = {
  error: function() {
    set++;
  }
}

var key = tracing.addAsyncListener(asyncNoHandleError);

process.nextTick(function() {
  throw 1;
});

tracing.removeAsyncListener(key);

var uncaughtFired = false;
process.on('uncaughtException', function() {
  uncaughtFired = true;

  // Throwing should call the error handler once, then propagate to
  // uncaughtException
  assert.equal(set, 1);
});

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  assert.ok(uncaughtFired);
  console.log('ok');
});
