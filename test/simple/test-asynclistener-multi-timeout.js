var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var addListener = tracing.addAsyncListener;
var removeListener = tracing.removeAsyncListener;
var caught = [];
var expect = [];

var callbacksObj = {
  error: function(value, er) {
    process._rawDebug('caught', er.message);
    caught.push(er.message);
    return (expect.indexOf(er.message) !== -1);
  }
};

var listener = tracing.createAsyncListener(callbacksObj);

process.on('exit', function(code) {
  removeListener(listener);

  if (code > 0)
    return;

  expect = expect.sort();
  caught = caught.sort();

  process._rawDebug('expect', expect);
  process._rawDebug('caught', caught);
  assert.deepEqual(caught, expect, 'caught all expected errors');
  process._rawDebug('ok');
});


expect.push('immediate simple a');
expect.push('immediate simple b');
process.nextTick(function() {
  addListener(listener);
  // Tests for a setImmediate specific bug encountered while implementing
  // AsyncListeners.
  setImmediate(function() {
    throw new Error('immediate simple a');
  });
  setImmediate(function() {
    throw new Error('immediate simple b');
  });
  removeListener(listener);
});
