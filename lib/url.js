/*
parse a url and return an object.  For "http://user:pass@example.com:8000/foo/bar?baz=quux#frag", return:
{
  href : "http://user:pass@example.com:8000/foo/bar?baz=quux#frag",
  protocol : "http:",
  auth : "user:pass",
  host : "user:pass@example.com:8000",
  hostname : "example.com",
  port : "8000",
  pathname : "/foo/bar",
  search : "?baz=quux",
  hash : "#frag"
}

Any parts that aren't found will not be filled in.  Pretty often, you won't have anything to the left
of the path, since the hostname isn't passed in the HTTP request line, so it'll just look like this:
{
  href : "/foo/bar?baz=quux#frag",
  pathname : "/foo/bar",
  search : "?baz=quux",
  hash : "#frag"
}

I've decided to paint this bikeshed the same color as the browser's window.location object, not because
it's necessarily 100% sane or rational, but because that's what we've all been using forever, so it's
a very well understood API surface, easy to implement, and easy to test.

The design goal here is to rely on regular expressions as little as possible, since they tend to be a bit
slow, and can be harder to debug.

*/

exports.parse = url_parse;
exports.resolve = url_resolve;
exports.resolveObject = url_resolveObject;
exports.format = url_format;

// define these here so at least they only have to be compiled once on the first module load.
var protocolPattern = /^([a-z0-9]+:)/,
  portPattern = /:[0-9]+$/;
function url_parse (url, parseQueryString) {
  if (url && typeof(url) === "object" && ("href" in url)) return url;
  
  var out = { href : url }, rest = url;
  
  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    out.protocol = proto;
    rest = rest.substr(proto.length);
  }
  
  // figure out if it's got a host
  if (rest.substr(0,2) === "//") {
    // there's a hostname.
    rest = rest.substr(2);
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.
    var nonHostChars = ["/", "?", ";", "#"], firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i ++) {
      var index = rest.indexOf(nonHostChars[i]);
      if (index !== -1 && (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }
    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost); 
    } else {
      out.host = rest;
      rest = "";
    }
    
    // pull out the auth and port.
    var p = parseHost(out.host);
    for (var i in p) out[i] = p[i];
    // we've indicated that there is a hostname, so even if it's empty, it has to be present.
    out.hostname = out.hostname || "";
  }
  
  // now rest is set to the post-host stuff.
  // chop off from the tail first.
  var hash = rest.indexOf("#");
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf("?");
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm+1);
    if (parseQueryString) out.query = require("querystring").parse(out.query);
    rest = rest.slice(0, qm);
  }
  if (rest) out.pathname = rest;
  
  return out;
};

// format a parsed object into a url string
function url_format (obj) {
  // ensure it's an object, and not a string url. If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings to clean up potentially wonky urls.
  if (typeof(obj) === "string") obj = url_parse(obj);
  
  var protocol = obj.protocol || "",
    host = (obj.host !== undefined) ? obj.host
      : obj.hostname !== undefined ? (
        (obj.auth ? obj.auth + "@" : "")
        + obj.hostname
        + (obj.port ? ":" + obj.port : "")
      ) 
      : false,
    pathname = obj.pathname || "",
    search = obj.search || (
      obj.query && ( "?" + (
        typeof(obj.query) === "object" 
        ? require("querystring").stringify(obj.query)
        : String(obj.query)
      ))
    ) || "",
    hash = obj.hash || "";
  
  if (protocol && protocol.substr(-1) !== ":") protocol += ":";
  if (host !== false) {
    host = "//" + host;
    if (pathname && pathname.charAt(0) !== "/") pathname = "/" + pathname;
  } else host = "";
  
  if (hash && hash.charAt(0) !== "#") hash = "#" + hash;
  if (search && search.charAt(0) !== "?") search = "?" + search;
  
  return protocol + host + pathname + search + hash;
};

function url_resolve (source, relative) {
  return url_format(url_resolveObject(source, relative));
};

function url_resolveObject (source, relative) {
  if (!source) return relative;
  
  source = url_parse(url_format(source));
  relative = url_parse(url_format(relative));

  if (relative.href === "") return source;
  if (relative.protocol) source.protocol = relative.protocol;
  if (relative.hash) source.hash = relative.hash;
  
  var path = require("path"),
    srcPath = path.normalize(source.pathname || "").split("/"),
    srcFile = srcPath.pop() || "",
    relPath = path.normalize(relative.pathname || "").split("/"),
    relFile = (relPath.pop() || "");
  
  if (
    ("host" in relative) && (relative.host || relative.host === "")
    || relative.pathname && relative.pathname.charAt(0) === "/"
  ) {
    source.hash = relative.hash;
    source.host = (relative.host || relative.host === "") ? relative.host : source.host;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    srcFile = relFile;
  } else if (("pathname" in relative) || ("search" in relative)) {
    // resolve relative paths
    if (relFile || relPath.length) srcFile = relFile;
    if (relFile || relPath.length || relative.search) {
      source.search = relative.search;
      source.query = relative.query;
      source.hash = relative.hash;
    }
    srcPath = srcPath.concat(relPath);
  }
  
  // back up "srcFile" to the first non-dot
  while (srcFile === ".." || srcFile === ".") {
    if (srcFile === "..") srcPath.pop();
    srcFile = srcPath.pop() || "";
  }
  
  if (source.pathname.charAt(0) === "/" || source.host) {
    var dirs = [];
    srcPath.forEach(function (dir, i) {
      if (dir === "..") dirs.pop();
      else if (dir !== "." && dir !== "") dirs.push(dir);
    });
    dirs.unshift("");
    srcPath = dirs;
  } else {
    srcPath = path.normalizeArray(srcPath);
  }
  
  source.pathname = srcPath.concat(srcFile).join("/");
  
  return source;
};

function parseHost (host) {
  var out = {};
  var at = host.indexOf("@");
  if (at !== -1) {
    out.auth = host.substr(0, at);
    host = host.substr(at+1); // drop the @
  }
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}
