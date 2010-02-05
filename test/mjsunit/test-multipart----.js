process.mixin(require("./common"));

var http = require("http"),
  multipart = require("multipart"),
  sys = require("sys"),
  PORT = 8222,
  fixture = require('./fixtures/multipart'),
  events = require("events");

var emails = fixture.messages.slice(0),
  chunkSize = 13,
  firstPart = new (events.Promise);
(function testEmails () {
  var email = emails.pop();
  if (!email) {
    firstPart.emitSuccess();
    return;
  }
  
  var message  = new (events.EventEmitter);
  message.headers = email.headers;
  
  var mp = multipart.parse(message);
  ["partBegin", "partEnd"].forEach(function (ev) {
    mp.addListener(ev, function () {
      sys.error(ev+": "+(mp.part.boundary || mp.part.filename ||
        JSON.stringify(mp.part.headers)));
    });
  });
  mp.addListener("complete", function () {
    sys.error("complete: "+mp.part.boundary);
    process.nextTick(testEmails);
  });
  mp.addListener("body", function (chunk) {
    // this is where you'd save the thing to a file, base64 decode it, etc.
    // look at part.filename to know if it's a file, or part.name if it's
    // a form field.
  });
  
  // stream it through in chunks.
  var emailBody = email.body;
  process.nextTick(function s () {
    if (emailBody) {
      message.emit("body", emailBody.substr(0, chunkSize));
      emailBody = emailBody.substr(chunkSize);
      process.nextTick(s);
    } else {
      message.emit("complete");
    }
  });

})();
