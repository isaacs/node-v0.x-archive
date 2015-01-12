// Flags: --expose_gc

var common = require('../common');
var assert = require('assert');
var v8 = require('tracing').v8;

assert(typeof gc === 'function', 'Run this test with --expose_gc.');

var ncalls = 0;
var before;
var after;

function ongc(before_, after_) {
  // Try very hard to not create garbage because that could kick off another
  // garbage collection cycle.
  before = before_;
  after = after_;
  ncalls += 1;
}

gc();
v8.on('gc', ongc);
gc();
v8.removeListener('gc', ongc);
gc();

assert.equal(ncalls, 1);
assert.equal(typeof before, 'object');
assert.equal(typeof after, 'object');
assert.equal(typeof before.timestamp, 'number');
assert.equal(typeof after.timestamp, 'number');
assert.equal(before.timestamp <= after.timestamp, true);
