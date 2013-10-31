// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common');
var assert = require('assert');

var L = require('_linklist');

var head = {name: 'head'};
var tail = {name: 'tail'};

var a = {name: 'a'};
var b = {name: 'b'};
var c = {name: 'c'};
var d = {name: 'd'};

var e = {name: 'e'};
var f = {name: 'f'};
var g = {name: 'g'};
var h = {name: 'h'};


function namer(x) {
  return x.name;
}

function test(headItems, tailItems) {
  console.error('%j + %j', headItems.map(namer), tailItems.map(namer));

  var head = { name: 'head' };
  var tail = { name: 'tail' };
  L.init(head);
  L.init(tail);

  headItems.forEach(function(x) {
    L.append(head, x);
  });

  tailItems.forEach(function(x) {
    L.append(tail, x);
  });

  head = L.concat(head, tail);
  var items = headItems.concat(tailItems);
  while (!L.isEmpty(head)) {
    var x = L.shift(head);
    assert.equal(x, items.shift());
  }
}

test([a, b, c, d, e, f, g, h], []);
test([a, b, c, d, e, f, g], [h]);
test([a, b, c, d, e, f], [g, h]);
test([a, b, c, d, e], [f, g, h]);
test([a, b, c, d], [e, f, g, h]);
test([a, b, c], [d, e, f, g, h]);
test([a, b], [c, d, e, f, g, h]);
test([a], [b, c, d, e, f, g, h]);
test([], [a, b, c, d, e, f, g, h]);
test([], []);
test([a], [b]);
test([a, b], [c, d]);
test([a, b], [c]);
test([a], [b, c]);
test([a], []);
test([], [a]);
test([a, b], []);
test([], [a, b]);

console.log('ok');
