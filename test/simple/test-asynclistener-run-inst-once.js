var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

var cntr = 0;
var al = tracing.createAsyncListener({
  create: function() { cntr++; },
});

process.on('exit', function() {
  assert.equal(cntr, 4);
  console.log('ok');
});

tracing.addAsyncListener(al);

process.nextTick(function() {
  tracing.addAsyncListener(al);
  process.nextTick(function() {
    tracing.addAsyncListener(al);
    process.nextTick(function() {
      process.nextTick(function() { });
    });
  });
});
