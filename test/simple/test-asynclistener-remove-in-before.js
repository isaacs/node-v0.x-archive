var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');
var done = false;
var callbacks = {
  before: function() {
    tracing.removeAsyncListener(listener);
  },
  after: function() {
    done = true;
  }
};

var listener = tracing.addAsyncListener(callbacks);

process.nextTick(function() {});

process.on('exit', function(status) {
  tracing.removeAsyncListener(listener);
  assert.equal(status, 0);
  assert.ok(done);
});
