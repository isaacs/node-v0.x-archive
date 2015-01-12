var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var set = 0;
var asyncNoHandleError = {
  before: function() {
    set++;
  },
  after: function() {
    set++;
  }
}

var key = tracing.addAsyncListener(asyncNoHandleError);

process.nextTick(function() { });

tracing.removeAsyncListener(key);

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  // Calling removeAsyncListener *after* a callback is scheduled
  // should not affect the handler from responding to the callback.
  assert.equal(set, 2);
  console.log('ok');
});

