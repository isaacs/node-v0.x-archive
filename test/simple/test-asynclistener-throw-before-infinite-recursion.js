var common = require('../common');
var assert = require('assert');
var tracing = require('tracing');

// If there is an uncaughtException listener then the error thrown from
// "before" will be considered handled, thus calling setImmediate to
// finish execution of the nextTickQueue. This in turn will cause "before"
// to fire again, entering into an infinite loop.
// So the asyncQueue is cleared from the returned setImmediate in
// _fatalException to prevent this from happening.
var cntr = 0;


tracing.addAsyncListener({
  before: function() {
    if (++cntr > 1) {
      // Can't throw since uncaughtException will also catch that.
      process._rawDebug('Error: Multiple before callbacks called');
      process.exit(1);
    }
    throw new Error('before');
  }
});

process.on('uncaughtException', function() { });

process.nextTick();
