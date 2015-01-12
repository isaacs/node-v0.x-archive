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

tracing.removeAsyncListener(key);

process.nextTick(function() { });

process.on('exit', function(code) {
  // If the exit code isn't ok then return early to throw the stack that
  // caused the bad return code.
  if (code !== 0)
    return;

  // The async handler should never be called.
  assert.equal(set, 0);
  console.log('ok');
});


