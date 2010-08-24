var common = require("../common");
var assert = common.assert;

assert.equal(true, process.cwd() !== __dirname);

process.chdir(__dirname);

assert.equal(true, process.cwd() === __dirname);
