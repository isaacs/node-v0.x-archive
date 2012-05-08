try {
  require('./a.js');
} catch (e) {
  console.log("require('./a.js') threw, but this was expected.");
}

console.error('after first require, cache=', Object.keys(require.cache));

var a = require('./a.js');
var b = require('./b.js');

exports.getStateA = function() {
  return a.getState();
};

exports.getStateB = function() {
  return b.getStateOfA();
};
