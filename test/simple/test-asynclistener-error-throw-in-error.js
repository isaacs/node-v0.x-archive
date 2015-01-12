var common = require('../common');
var assert = require('assert');
var spawn = require('child_process').spawn;
var tracing = require('tracing');

var checkStr = 'WRITTEN ON EXIT';

if (process.argv[2] === 'child')
  runChild();
else
  runParent();


function runChild() {
  var cntr = 0;

  var key = tracing.addAsyncListener({
    error: function onError() {
      cntr++;
      throw new Error('onError');
    }
  });

  process.on('unhandledException', function() {
    // Throwing in 'error' should bypass unhandledException.
    process.exit(2);
  });

  process.on('exit', function() {
    // Make sure that we can still write out to stderr even when the
    // process dies.
    process._rawDebug(checkStr);
  });

  process.nextTick(function() {
    throw new Error('nextTick');
  });
}


function runParent() {
  var childDidExit = false;
  var childStr = '';
  var child = spawn(process.execPath, [__filename, 'child']);
  child.stderr.on('data', function(chunk) {
    process._rawDebug('received data from child');
    childStr += chunk.toString();
  });

  child.on('exit', function(code) {
    process._rawDebug('child process exiting');
    childDidExit = true;
    // This is thrown when Node throws from _fatalException.
    assert.equal(code, 7);
  });

  process.on('exit', function() {
    process._rawDebug('child ondata message:',
                childStr.substr(0, checkStr.length));

    assert.ok(childDidExit);
    assert.equal(childStr.substr(0, checkStr.length), checkStr);
    console.log('ok');
  });
}

