var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');
var val;
var callbacks = {
  create: function() {
    return 42;
  },
  before: function() {
    tracing.removeAsyncListener(listener);
    tracing.addAsyncListener(listener);
  },
  after: function(context, storage) {
    val = storage;
  }
};

var listener = tracing.addAsyncListener(callbacks);

process.nextTick(function() {});

process.on('exit', function(status) {
  tracing.removeAsyncListener(listener);
  assert.equal(status, 0);
  assert.equal(val, 42);
});
