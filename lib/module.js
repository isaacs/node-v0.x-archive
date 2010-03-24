
exports.main = main;
exports.require = require;
exports.requireNative = requireNative;
exports.Module = Module;
exports.paths = [];

exports.extensionCache = {};
var registerExtension = exports.registerExtension =
  phaseRegistrar("extensionCache", "compile");

exports.schemeCache = {};
var registerScheme = exports.registerScheme =
  phaseRegistrar("schemeCache", "resolve");

// This contains the source code for the files in lib/
// Like, natives.fs is the contents of lib/fs.js
var natives = process.binding('natives'),
  nativeModuleCache = { module : exports };

// This returns the exports, not the module object, because it is
// used in the bootstrap process, before the Module class is set up.
function requireNative (id, cb) {
  if (id in nativeModuleCache) {
    return nativeModuleCache[id];
  }
  if (!(id in natives)) {
    var er = new Error(
      "Native module "+id+" not found");
    if (cb) cb(er);
    else throw er;
    return er;
  }
  var mod = new exports.Module(id, null, id);
  var data = nativeModuleCache[id] = mod.compile(natives[id]);
  if (cb) cb(null, data);
  return data;
}

// load the ID relative to the parent ID
// async if callback provided.
function require (id, parent, cache, cb) {
  if (typeof cache === "function") {
    cb = cache;
    cache = null;
  }
  if ((id in natives) || (id in nativeModuleCache)) {
    return requireNative(id, cb);
  }
  if (parent && !cache) cache = parent.moduleCache;
  var base = (parent && parent.uri) ? parent.uri : "";
  if (cb) {
    resolve(base, id, parent, cache, function (er, uri) {
      if (er) return cb(er);
      requireResolved(parent, uri, cache, cb);
    });
  } else {
    return requireResolved(parent, resolve(base, id, parent, cache), cache);
  }
}
// continue the require() once the URI is resolved.
function requireResolved (parent, uri, cache, cb) {
  if (uri instanceof exports.Module) {
    var child = uri;
    child.locked = true;
    if (cb) cb(null, child.exports);
    return child.exports;
  }
  if (!uri) throw new Error(
    "Module "+id+" could not be found");
  if (cache && (uri in cache)) {
    var child = cache[uri];
    child.locked = true;
    if (cb) cb(null, child.exports);
    return child.exports;
  }
  var child = new exports.Module(uri, parent);
  return loadModule(child, cb);
}

// Set the module.exports reference, overriding the module.exports lock.
// Use with caution!
function forceSetExports (module, data) {
  var locked = module.locked;
  module.locked = false;
  module.exports = data;
  module.locked = locked;
}
// The callback that is triggered after the first module.compile() pass
// has completed.  Might get either export data, or a JS string.
function firstCompile (module, data, cb) {
  // if it's a .js module already, or if the thing returned isn't a string,
  // or if it's already been compiled as JS, then return the data as-is
  if (
    module.ext === ".js"
    || "string" !== typeof data
    || module.compileJS === noopCompile
  ) {
    if (data !== undefined) {
      forceSetExports(module, data);
    }
    if (cb) cb(null, module.exports);
    return module.exports;
  }
  // compile as JavaScript
  if (cb) {
    module.compileJS(data, function (er, data) {
      if (er) return cb(er);
      forceSetExports(module, data);
      cb(null, module.exports);
    });
  } else {
    forceSetExports(module, module.compileJS(data));
    return module.exports;
  }
}

// Compile a module after its data has been loaded.
// This either calls module.compile, or sets the exports
// if the loader returns an object.
function compileModule (module, data, cb) {
  if ("string" !== typeof data) {
    if (data !== undefined) {
      forceSetExports(module, data);
    }
    if (cb) cb(null, module.exports);
    return module.exports;
  }
  // the string data is the loaded stuff.
  if (cb) {
    module.compile(data, function (er, data) {
      if (er) return cb(er);
      firstCompile(module, data, cb);
    });
  } else {
    return firstCompile(module, module.compile(data));
  }
}

// Load a module after it's been resolved.
function loadModule (module, cb) {
  if (cb) {
    return module.load(function (er, data) {
      if (er) return cb(er);
      compileModule(module, data, cb);
    });
  } else {
    return compileModule(module, module.load());
  }
}

// search the paths for id, and then return the resolved filename.
// If a scheme handler has been registered for the "resolve" phase,
// then it is called.
// TODO: This function is big. Maybe it should be chopped up?
function resolve (root, id, parent, cache, cb) {
  var searchPaths = exports.paths,
    filenames = [],
    f = 0,
    path = requireNative("path"),
    fs = requireNative("fs");

  if (!id) {
    var er = new Error("Invalid module id: "+id);
    if (cb) return cb(er);
    throw er;
  }

  // check the scheme here.
  // if it's something registered, then treat it as absolute.
  var scheme = schemename(id);
  if (scheme === "file:") {
    id = id.substr(0, scheme.length);
    if (id.substr(0, 2) === "//") id = id.substr(2);
  } else if (scheme) {
    var s = exports.schemeCache[scheme];
    s = s && s.resolve;
    if (s) {
      if (cb) {
        if (parent) parent.womb[id] = true;
        s(id, parent, function (er, resolvedUri) {
          if (er) return cb(er);
          if (parent) {
            parent.womb[resolvedUri] = parent.womb[id];
            delete parent.womb[id];
          }
          cb(null, resolvedUri);
        });
      } else {
        return s(id, parent);
      }
    }
  }

  // the default file-system style lookup
  if (id.charAt(0) === "/") {
    // absolute.
    searchPaths = [""];
  } else if (id.charAt(0) === '.') {
    searchPaths = [ dirname(root) ];
  }
  if (parent && searchPaths.length === 1) {
    // short-circuit here by checking the cache,
    // since it can only be one thing.
    var shortCircuit = path.join(searchPaths[0], id);
    if (shortCircuit in cache) {
      if (cb) {
        cb(null, cache[shortCircuit]);
      }
      return cache[shortCircuit];
    }
  }
  for (var i = 0, l = searchPaths.length; i < l; i ++) {
    var searchPath = path.join(searchPaths[i], id);
    var exts = Object.keys(exports.extensionCache);
    for (var j = 0, m = exts.length; j < m; j ++) {
      var ext = exts[j];
      filenames[f++] = searchPath+ext;
      filenames[f++] = path.join(searchPath, "index"+ext);
    }
  }

  // now filenames is the list of files to check for.
  if (cb) { // async
    if (parent) parent.womb[id] = true;
    (function L (i) {
      if (i === filenames.length) {
        if (parent) {
          // miscarry
          delete parent.womb[id];
        }
        return cb(new Error("Module "+id+" not found"));
      }
      exists(filenames[i], function (e) {
        if (!e) return L(i+1);
        if (parent) {
          // trimester advancement
          parent.womb[filenames[i]] = parent.womb[id];
          delete parent.womb[id];
        }
        cb(null, filenames[i]);
      });
    })(0);
    return;
  }
  // sync
  for (var i = 0, l = filenames.length; i < l; i ++) {
    if (existsSync(filenames[i])) {
      return filenames[i];
    }
  }
  throw new Error("Module "+id+" not found");
}

// Load the supplied URI as the process.mainModule,
// or return it if it's already been loaded.
function main (uri) {
  if (process.mainModule) return process.mainModule;
  process.mainModule = new exports.Module(uri, null, ".");
  nativeModuleCache["."] = process.mainModule.exports;
  loadModule(process.mainModule, function (er) {
    if (er) throw er;
  });
  return process.mainModule;
}

// The Module class.
// Note that when this class is created, the URI has not
// been resolved, the data has not been loaded or compiled,
// etc.  Parent is the module doing the require() call.
// In the case of native modules, there is no parent.
function Module (uri, parent, id) {
  this.uri = this.filename = uri;

  // Save the resolved filename without the extension,
  // so that any future attempts to resolve will be short-circuited
  // before they have to stat a bunch of files all over again.
  var abs = this.filename.replace(/(\/index)?\.[^\.]+$/, '');
  id = id || abs;

  // CommonJS Module Context 3.1
  Object.defineProperty(this, "id", {value:id, enumerable:true});
  this.ext = extname(uri || "") || ".js";
  this.scheme = schemename(uri);

  var moduleExports = {};
  Object.defineProperty(this, "exports",
    { set : function (newExports) {
        if (this.locked) throw new Error(
          "Cannot set exports after being required by another module");
        moduleExports = newExports;
      }
    , get : function () { return moduleExports }
    });

  if (parent) {
    this.parent = parent;
    if ("function" === typeof parent.womb[uri]) {
      this.onload = parent.womb[uri];
    }
    // birthing process
    delete parent.womb[uri];
    parent.children.push(this);
    this.moduleCache = parent.moduleCache;
  } else {
    this.moduleCache = {};
  }

  var mc = this.moduleCache;
  mc[ id ] = mc[ abs ] = mc[ uri ] = this;

  this.loaded = false;
  this.locked = false;
  this.exited = false;
  this.children = [];
  this.womb = {};

  // bind require's context
  var self = this;
  this.require = function (id) {
    return require(id, self, self.moduleCache);
  }
  this.require.uncached = function (id) {
    return require(id, self, {});
  }
  this.require.async = function (id, cb) {
    return require(id, self, self.moduleCache, cb || noop);
  };
  this.require.uncached.async =
  this.require.async.uncached = function (id, cb) {
    return require(id, self, {}, cb || noop);
  }
  Object.defineProperty(this.require, "main",
    { get : function () { return process.mainModule }
    , enumerable : true
    });
  Object.defineProperty(this.require, "paths",
    { set : function (newPaths) {
        // can't just set the exports.paths directly, because of
        // 1.6.2 in the CommonJS Modules 1.1 contract.
        for (var i = 0, l = newPaths.length; i < l; i ++) {
          exports.paths[i] = newPaths[i];
        }
        for (var l = exports.length; i < l; i ++) {
          delete exports.paths[i];
        }
      }
    , get : function () { return exports.paths }
    , enumerable : true
    });
  this.require.registerExtension = exports.registerExtension;
  this.require.registerScheme = exports.registerScheme;
}

// memoizing load function.
// Look up the loader for this type of module,
// and then attach it to this.load, and call it.
Module.prototype.load = function (cb) {
  var loader;
  // first check for scheme, since that has a greater effect on how to get the data.
  var s = this.scheme;
  s = s && exports.schemeCache[s];
  if (s) {
    loader = s && s.load;
  }
  if (!loader) {
    // use the loader registered for this extension
    loader = exports.extensionCache[ this.ext ];
    loader = loader && loader.load;
  }
  if (!loader && (this.ext !== ".js")) {
    loader = exports.extensionCache[ ".js" ];
    loader = loader && loader.load;
  }
  if (!loader) {
    var er = new Error("No loader found for "+this.uri);
    if (cb) cb(er);
    else throw er;
    return er;
  }
  this.load = loader;
  return this.load(cb);
}

// Get the compiler for a given extension.
function getCompiler (ext) {
  ext = ext || ".js";
  var compiler = exports.extensionCache[ ext ];
  compiler = compiler && compiler.compile;
  if (!compiler && (ext !== ".js")) {
    return getCompiler(".js");
  }
  return compiler;
}
// Memoizing compile function. Load the appropriate compiler,
// and then call it.
Module.prototype.compile = function (code, cb) {
  this.compile = getCompiler(this.ext);
  return this.compile(code, cb);
}
// Compile as JS, if it hasn't already been done.
Module.prototype.compileJS = function (code, cb) {
  // if its already been compiled as a JS module,
  // then don't compile it again.  Set to noop here
  // so that the logic is simpler later on.
  this.compileJS = getCompiler(".js");
  if (this.compileJS === this.compile) {
    this.compileJS = noopCompile;
  }
  return this.compileJS(code, cb);
}
Module.prototype.waitForChildren = function (cb) {
  var children = this.children,
    expecting = Object.keys(this.womb),
    litter = expecting.length + children.length,
    loaded = 0;

  this.waiting = function () {
    delete this.waiting;
    this.loaded = true;
    if (this.onload) this.onload();
    cb(null, this.exports);
  }

  function onload () {
    this.onload = null;
    loaded ++;
    if (loaded === litter && this.parent.waiting) this.parent.waiting();
  }

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.loaded) {
      loaded ++;
    } else {
      child.onload = onload;
    }
  }
  for (var i = 0; i < expecting.length; i ++) {
    // this will get attached once it's resolved, and then called when it's loaded.
    this.womb[ expecting[i] ] = onload;
  }
  if (loaded === litter && this.waiting) this.waiting();
}

// register a function for a certain phase in the specified cache.
function phaseRegistrar (cache, defaultPhase) { return function (key, fn) {
  var phase = defaultPhase;
  if (arguments.length > 2) {
    phase = fn;
    fn = arguments[2];
  }
  var c = exports[cache];
  c[key] = c[key] || {};
  c[key][phase] = fn;
}}

// some helper functions.
function exists (path, cb) {
  process.binding('fs').stat(path, function (er) { cb(!er) });
}
function existsSync (path) {
  try {
    process.binding('fs').stat(path);
  } catch (e) {
    return false;
  }
  return true;
}
function noop () {}
function noopCompile (data, cb) {
  if (cb) cb(data);
  return data;
}
function dirname (path) {
  path = path || "";
  return path.substr(0, path.lastIndexOf("/")) || ".";
};
function extname (path) {
  var index = path.lastIndexOf('.');
  return index < 0 ? '' : path.substring(index);
}
function schemename (path) {
  var s = /^[a-z][a-z0-9]*:/(path);
  return s && s[0] || "";
}

// bootstrap the module module
// this is where the default node module-loading logic is.
function bootstrap () {
  // register the default handlers for .js, .node, and http modules.
  registerExtension(".js", "load", function (cb) {
    var fs = exports.requireNative("fs"),
      filename = this.uri;
    if (cb) fs.readFile(filename, cb);
    else return fs.readFileSync(filename);
  });
  registerExtension(".js", "compile", function (content, cb) {
    content = content.replace(/^\#\!.*/, '');
    content = 'this.__proto__ = local;' + content;
    var sandbox = {
      exports: this.exports,
      require: this.require,
      module: this,
      __filename: this.filename,
      __dirname: dirname(this.filename)
    };
    sandbox.GLOBAL = sandbox.global = GLOBAL;
    sandbox.local = sandbox.LOCAL = sandbox;
    sandbox.local.__proto__ = GLOBAL;

    if (this.filename === process.argv[1]) {
      process.checkBreak();
    }
    try {
      process.evalcx(content, sandbox, this.filename);
    } catch (ex) {
      if (cb) return cb(ex);
      else throw ex;
    }
    if (cb) {
      this.waitForChildren(cb);
    } else {
      this.loaded = true;
      return this.exports;
    }
  });

  // the module is already compiled, so compiling it to a JS function is unnecessary.
  exports.registerExtension(".node", "load", function (cb) {
    // XXX Not yet supporting loading from HTTP. would need to download the
    // file, store it to tmp then run dlopen on it.
    process.dlopen(this.filename, this.exports); // FIXME synchronus
    if (cb) cb(null, this.exports);
    return this.exports;
  });

  // TODO: This should download the file to a temp location, and then
  // somehow signal that the downloaded file should be loaded.
  exports.registerScheme("http:", "resolve", function (url, parent, cb) {
    if (!cb) throw new Error(
      "Sync require() not allowed for remote modules");
    if (path.extname(url) === ".node") {
      // TODO: download the file to a temp folder, and then
      // cb() with the temp file location.  Keep a cache of
      // url->tempfile to avoid unnecessary fetching.
      throw new Error(
        "Remote-loading compiled modules is not (yet) supported.");
    }
    if (cb) cb(null, url)
    return url;
  });
  exports.registerScheme("http:", "load", function (cb) {
    require("http").cat(this.uri, cb);
  });

  var path = requireNative("path");

  if (process.env["HOME"]) {
    exports.paths.unshift(path.join(process.env["HOME"], ".node_libraries"));
  }

  if (process.env["NODE_PATH"]) {
    exports.paths = process.env["NODE_PATH"].split(":").concat(exports.paths);
  }

}

bootstrap();
