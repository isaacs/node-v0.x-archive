exports.print = function (x) {
  process.stdio.write(x);
};

exports.puts = function (x) {
  process.stdio.write(x + "\n");
};

exports.exec = function (command) {
  var child = process.createChildProcess("/bin/sh", ["-c", command]);
  var stdout = "";
  var stderr = "";
  var promise = new process.Promise();

  child.addListener("output", function (chunk) {
    if (chunk) stdout += chunk;
  });

  child.addListener("error", function (chunk) {
    if (chunk) stderr += chunk;
  });

  child.addListener("exit", function (code) {
    if (code == 0) {
      promise.emitSuccess(stdout, stderr);
    } else {
      promise.emitError(code, stdout, stderr);
    }
  });

  return promise;
};

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be revritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype
 * @param {function} superCtor Constructor function to inherit prototype from
 */
exports.inherits = process.inherits;


// move some things over to the internal debug module.
// TODO: Remove this cruft in a few versions (isaacs 2009-12-17)
try {
  var debug = require("debug");
  ["inspect", "log"].forEach(function (fn) {
    exports[fn] = function () {
      debug.log("sys."+fn+" is deprecated. Please use debug."+fn+" instead.", "deprecated");
      return debug[fn].apply(this, arguments);
    }
  });
  exports.p = function () {
    debug.log("sys.p is deprecated.  Please use debug.log instead.", "deprecated");
    return debug.log.apply(this, arguments);
  };
  ["error", "debug"].forEach(function (fn) {
    exports[fn] = function () {
      debug.log("sys."+fn+" is deprecated. Please use debug.log instead.", "deprecated");
      return debug[fn].call(this, arguments, fn);
    }
  });

} catch (ex) {}