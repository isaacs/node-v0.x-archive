console.error('in b, require.cache=', Object.keys(require.cache));

var a = require('./a.js');

console.error('in b, after require, require.cache=',
              Object.keys(require.cache));

exports.getStateOfA = function() {
  return a.getState();
};
