#!/usr/bin/env node
var fs = require('fs');
var marked = require('marked');
var mkdirp = require('mkdirp');
var glob = require('glob');
var ejs = require('ejs');
var path = require('path');

var input = path.resolve(process.argv[2]);
var output = path.resolve(process.argv[3]);
var template = path.resolve(process.argv[4]);

console.error("argv=%j", process.argv)

fs.readFile(template, 'utf8', function(er, contents) {
  if (er) throw er;
  template = ejs.compile(contents, template);
  readInput();
});

function readInput() {
  glob(input + '/**/*.md', function(er, files) {
    if (er) throw er;
    readFiles(files);
  });
}

function readFiles(files) {
  var n = files.length;
  var data = {};

  files.forEach(function(file) {
    fs.readFile(file, 'utf8', next(file));
  });

  function next(file) { return function(er, contents) {
    if (er) throw er;
    if (contents) {
      contents = parseFile(file, contents);
      if (contents) {
        data[file] = contents
      }
    }
    if (--n === 0) {
      buildOutput(data);
    }
  }}
}

function parseFile(file, contents) {
  var c = contents.split('\n\n');
  var head = c.shift();
  c = c.join('\n\n');
  var post = head.split('\n').reduce(function(set, kv) {
    kv = kv.split(':');
    var key = kv.shift().trim();
    var val = kv.join(':').trim();
    set[key] = val;
    return set;
  }, {});
  if (post.status && post.status !== 'publish') return null;
  post.body = c;
  return post;
}

function buildOutput(data) {
  buildPermalinks(data);
}

function buildPermalinks(data) {
  Object.keys(data).forEach(function(k) {
    buildPermalink(k, data[k]);
  });
}

function buildPermalink(key, post) {
  console.error('post', key, post);
  var data = {};
  data.pageid = post.slug;
  data.title = post.title;
  data.content = marked.parse(post.body);

  // Fix for chjj/marked#56
  data.content = data.content
    .replace(/<a href="([^"]+)&lt;\/a&gt;">\1&lt;\/a&gt;/, '$1');

  data.post = post;

  var d = new Date(post.date);
  console.error(d, d instanceof Date);

  var y = d.getYear() + 1900;
  var m = d.getMonth() + 1;
  var d = d.getDate();
  var uri = '/' + y + '/' + m + '/' + d + '/' + post.slug;

  writeFile(uri, data);
}

function writeFile(uri, data) {
  var contents = template(data);
  var outdir = path.join(output, uri);
  mkdirp(outdir, function(er) {
    if (er) throw er;
    var file = path.resolve(outdir, 'index.html');
    fs.writeFile(file, contents, 'utf8', function(er) {
      if (er) throw er;
      console.log('wrote: ', file);
    });
  });
}
