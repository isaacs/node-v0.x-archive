process.mixin(require("./common"));

var http = require("http"),
  multipart = require("multipart2"),
  sys = require("sys"),
  PORT = 8222,
  fixture = require('./fixtures/multipart'),
  events = require("events");

var emails = fixture.messages,
  chunkSize = 13;
(function testEmails () {
  var email = emails.pop();
  if (!email) return;
  
  var message  = new (events.EventEmitter);
  message.headers = email.headers;
  
  multipart.cat(message).addCallback(function (message) {
    sys.puts(sys.inspect(message));
  });
  
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
    if (mp.part.filename) {
      sys.error("\t\t"+mp.part.filename + " ----- " + JSON.stringify(chunk));
    }
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
