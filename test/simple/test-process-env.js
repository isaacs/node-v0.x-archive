process.mixin(require("../common"));

var childOutput = "",
  sys = require("sys"),
  path = require("path");

process.env.PATH += ":" + path.join(__dirname, "../fixtures");

process.createChildProcess("child-env.js", [], {
  for_the_child : "a pretty present" })
  .addListener("error", function (chunk) {
    if (chunk) childOutput += chunk;
  })
  .addListener("output", function (chunk) {
    if (chunk) childOutput += chunk;
  })
  .addListener("exit", function (code) {
    if (code) throw new Error("failed with "+code);
    else {
      assert.equal("a pretty present", childOutput);
      sys.puts("ok");
    }
  });
