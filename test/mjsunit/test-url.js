process.mixin(require("./common"));

var url = require("url"),
  sys = require("sys");

// URLs to parse, and expected data
// { url : parsed }
var parseTests = {
  "http://www.narwhaljs.org/blog/categories?id=news" : {
    "href": "http://www.narwhaljs.org/blog/categories?id=news",
    "protocol": "http:",
    "host": "www.narwhaljs.org",
    "hostname": "www.narwhaljs.org",
    "search": "?id=news",
    "pathname": "/blog/categories"
  },
  "http://mt0.google.com/vt/lyrs=m@114&hl=en&src=api&x=2&y=2&z=3&s=" : {
    "href": "http://mt0.google.com/vt/lyrs=m@114&hl=en&src=api&x=2&y=2&z=3&s=",
    "protocol": "http:",
    "host": "mt0.google.com",
    "hostname": "mt0.google.com",
    "pathname": "/vt/lyrs=m@114&hl=en&src=api&x=2&y=2&z=3&s="
  },
  "http://mt0.google.com/vt/lyrs=m@114???&hl=en&src=api&x=2&y=2&z=3&s=" : {
    "href": "http://mt0.google.com/vt/lyrs=m@114???&hl=en&src=api&x=2&y=2&z=3&s=",
    "protocol": "http:",
    "host": "mt0.google.com",
    "hostname": "mt0.google.com",
    "search": "???&hl=en&src=api&x=2&y=2&z=3&s=",
    "pathname": "/vt/lyrs=m@114"
  },
  "http://user:pass@mt0.google.com/vt/lyrs=m@114???&hl=en&src=api&x=2&y=2&z=3&s=" : {
    "href": "http://user:pass@mt0.google.com/vt/lyrs=m@114???&hl=en&src=api&x=2&y=2&z=3&s=",
    "protocol": "http:",
    "host": "user:pass@mt0.google.com",
    "auth": "user:pass",
    "hostname": "mt0.google.com",
    "search": "???&hl=en&src=api&x=2&y=2&z=3&s=",
    "pathname": "/vt/lyrs=m@114"
  },
  "file:///etc/passwd" : {
    "href": "file:///etc/passwd",
    "protocol": "file:",
    "host": "",
    "hostname": "",
    "pathname": "/etc/passwd"
  },
  "file:///etc/node/" : {
    "href": "file:///etc/node/",
    "protocol": "file:",
    "host": "",
    "hostname": "",
    "pathname": "/etc/node/"
  },
  "http:/baz/../foo/bar" : {
   "href": "http:/baz/../foo/bar",
   "protocol": "http:",
   "pathname": "/baz/../foo/bar"
  },
  "http://user:pass@example.com:8000/foo/bar?baz=quux#frag" : {
   "href": "http://user:pass@example.com:8000/foo/bar?baz=quux#frag",
   "protocol": "http:",
   "host": "user:pass@example.com:8000",
   "auth": "user:pass",
   "port": "8000",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?baz=quux",
   "pathname": "/foo/bar"
  },
  "//user:pass@example.com:8000/foo/bar?baz=quux#frag" : {
   "href": "//user:pass@example.com:8000/foo/bar?baz=quux#frag",
   "host": "user:pass@example.com:8000",
   "auth": "user:pass",
   "port": "8000",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?baz=quux",
   "pathname": "/foo/bar"
  },
  "http://example.com?foo=bar#frag" : {
   "href": "http://example.com?foo=bar#frag",
   "protocol": "http:",
   "host": "example.com",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?foo=bar"
  },
  "http://example.com?foo=@bar#frag" : {
   "href": "http://example.com?foo=@bar#frag",
   "protocol": "http:",
   "host": "example.com",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?foo=@bar"
  },
  "http://example.com?foo=/bar/#frag" : {
   "href": "http://example.com?foo=/bar/#frag",
   "protocol": "http:",
   "host": "example.com",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?foo=/bar/"
  },
  "http://example.com?foo=?bar/#frag" : {
   "href": "http://example.com?foo=?bar/#frag",
   "protocol": "http:",
   "host": "example.com",
   "hostname": "example.com",
   "hash": "#frag",
   "search": "?foo=?bar/"
  },
  "http://example.com#frag=?bar/#frag" : {
   "href": "http://example.com#frag=?bar/#frag",
   "protocol": "http:",
   "host": "example.com",
   "hostname": "example.com",
   "hash": "#frag=?bar/#frag"
  },
  "/foo/bar?baz=quux#frag" : {
   "href": "/foo/bar?baz=quux#frag",
   "hash": "#frag",
   "search": "?baz=quux",
   "pathname": "/foo/bar"
  },
  "http:/foo/bar?baz=quux#frag" : {
   "href": "http:/foo/bar?baz=quux#frag",
   "protocol": "http:",
   "hash": "#frag",
   "search": "?baz=quux",
   "pathname": "/foo/bar"
  },
  "mailto:foo@bar.com?subject=hello" : {
   "href": "mailto:foo@bar.com?subject=hello",
   "protocol": "mailto:",
   "pathname": "foo@bar.com",
   "search": "?subject=hello"
  },
  "javascript:alert('hello');" : {
   "href": "javascript:alert('hello');",
   "protocol": "javascript:",
   "pathname": "alert('hello');"
  },
  "xmpp://isaacschlueter@jabber.org" : {
   "href": "xmpp://isaacschlueter@jabber.org",
   "protocol": "xmpp:",
   "host": "isaacschlueter@jabber.org",
   "auth": "isaacschlueter",
   "hostname": "jabber.org"
  }
};
for (var u in parseTests) {
  var actual = url.parse(u),
    expected = parseTests[u];
  for (var i in expected) {
    var e = JSON.stringify(expected[i]),
      a = JSON.stringify(actual[i]);
    assert.equal(e, a, "parse(" + u + ")."+i+" == "+e+"\nactual: "+a);
  }
  
  var expected = u,
    actual = url.format(parseTests[u]);
  
  assert.equal(expected, actual, "format("+u+") == "+u+"\nactual:"+actual);
}

// some extra formatting tests, just to verify that it'll format slightly wonky content to a valid url.
var formatTests = {
  "http://a.com/a/b/c?s#h" : {
   "protocol": "http",
   "host": "a.com",
   "pathname": "a/b/c",
   "hash": "h",
   "search": "s"
  }
};
for (var u in formatTests) {
  var actual = url.format(formatTests[u]);
  assert.equal(actual, u, "wonky format("+u+") == "+u+"\nactual:"+actual);
}

[
  // [from, path, expected]
  ["/foo/bar/baz", "quux", "/foo/bar/quux"],
  ["/foo/bar/baz", "quux/asdf", "/foo/bar/quux/asdf"],
  ["/foo/bar/baz", "quux/baz", "/foo/bar/quux/baz"],
  ["/foo/bar/baz", "../quux/baz", "/foo/quux/baz"],
  ["/foo/bar/baz", "/bar", "/bar"],
  ["/foo/bar/baz/", "quux", "/foo/bar/baz/quux"],
  ["/foo/bar/baz/", "quux/baz", "/foo/bar/baz/quux/baz"],
  ["/foo/bar/baz", "../../../../../../../../quux/baz", "/quux/baz"],
  ["/foo/bar/baz", "../../../../../../../quux/baz", "/quux/baz"],
  ["foo/bar", "../../../baz", "../../baz"],
  ["foo/bar/", "../../../baz", "../baz"],
  ["http://u:p@h.com/p/a/t/h?s#hash", "https:#hash2", "https://u:p@h.com/p/a/t/h?s#hash2" ],
  ["http://u:p@h.com/p/a/t/h?s#hash", "https:/p/a/t/h?s#hash2", "https://u:p@h.com/p/a/t/h?s#hash2" ],
  ["http://u:p@h.com/p/a/t/h?s#hash", "https://u:p@h.com/p/a/t/h?s#hash2", "https://u:p@h.com/p/a/t/h?s#hash2" ],
  ["http://u:p@h.com/p/a/t/h?s#hash", "https:/a/b/c/d", "https://u:p@h.com/a/b/c/d" ],
  ["/foo/bar/baz", "/../etc/passwd", "/etc/passwd"]
].forEach(function (relativeTest) {
  var a = url.resolve(relativeTest[0], relativeTest[1]),
    e = relativeTest[2];
  assert.equal(e, a,
    "resolve("+[relativeTest[0], relativeTest[1]]+") == "+e+
    "\n  actual="+a);
});

