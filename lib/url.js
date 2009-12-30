

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
  hash : "#frag",
  
  // common aliases
  fragment : <hash>,
  querystring : <search>,
  path : <pathname>,
  
  // stringifying object returns the href.
  toString : function () { return this.href }
}

Any parts that aren't found will not be filled in.  Pretty often, you won't have anything to the left
of the path, since the hostname isn't passed in the HTTP request line, so it'll just look like this:
{
  href : "/foo/bar?baz=quux#frag",
  pathname : "/foo/bar",
  search : "?baz=quux",
  hash : "#frag",
  toString : function () { return this.href }
}

I've decided to paint this bikeshed the same color as the browser's window.location object, not because
it's necessarily 100% sane or rational, but because that's what we've all been using forever, so it's
a very well understood API surface, easy to implement, and easy to test.

The design goal here is to rely on regular expressions as little as possible, since they tend to be a bit
slow, and can be harder to debug.
*/
// define these here so at least they only have to be compiled once on the first module load.
var protocolPattern = /^([a-z0-9]+:)/,
  portPattern = /:[0-9]+$/;
function url_parse (url) {
  var out = {}, rest = url;
  
  var proto = protocolPattern.exec(url);
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
      // there was a non-host character found.
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost); 
    } else {
      out.host = rest;
      rest = "";
    }
    
    // now pull out the auth and port.
    var hostname = out.host;
    var at = hostname.indexOf("@");
    if (at !== -1) {
      out.auth = hostname.substr(0, at);
      hostname = hostname.substr(at+1); // drop the @
    }
    var port = portPattern.exec(hostname);
    if (port) {
      port = port[0];
      out.port = port.substr(1);
      hostname = hostname.substr(0, hostname.length - port.length);
    }
    out.hostname = hostname;
    
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
    rest = rest.slice(0, qm);
  }
  if (rest) out.pathname = rest;

  return out;
};






function w (m) {
  process.stdio.writeError(JSON.stringify(m,null,2)+"\n");
};

function test (url) {
  process.stdio.writeError("\n"+url+" ");
  w(url_parse(url));
}


test("http://user:pass@example.com:8000/foo/bar?baz=quux#frag");
test("//user:pass@example.com:8000/foo/bar?baz=quux#frag");
test("http://example.com?foo=bar#frag");
test("http://example.com?foo=@bar#frag");
test("http://example.com?foo=/bar/#frag");
test("http://example.com?foo=?bar/#frag");
test("http://example.com#frag=?bar/#frag");
test("/foo/bar?baz=quux#frag");
test("http:/foo/bar?baz=quux#frag");
test("mailto:foo@bar.com?subject=hello");
test("mailto://foo@bar.com?subject=hello");
test("javascript:alert('hello');");
test("xmpp://isaacschlueter@jabber.org");

