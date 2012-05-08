var state = "initializing";
var b = require('./b.js');

exports.getState = function() {
  return state;
};

// hang on the parent module so that the global checker doesn't get upset
if (!module.parent.someRandomCondition) {
  module.parent.someRandomCondition = true;
  state = "broken";
  throw "foo";
} else {
  state = "ok";
}
