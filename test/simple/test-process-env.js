process.mixin(require("../common"));
var child = process.createChildProcess('/usr/bin/env', [], {'HELLO' : 'WORLD'}),
  response = "";
child.addListener("output", function (chunk) {
  puts("stdout: " + JSON.stringify(chunk));
  if (chunk) {
    response += chunk;
    if (response === "HELLO=WORLD\n") {
      puts("closing");
      child .close();
    }
  }
});
process.addListener('exit', function () {
  assert.ok(response.indexOf('HELLO=WORLD') >= 0);
});