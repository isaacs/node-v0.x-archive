process.mixin(require("./common"));

var http = require("http"),
  multipart = require("multipart2"),
  sys = require("sys"),
  PORT = 8222,
  fixture = require('./fixtures/multipart'),
  events = require("events");


var emailMessage = new events.EventEmitter;
emailMessage.headers = fixture.emailHeaders;

var mp = multipart.parse(emailMessage);
["complete", "partBegin", "partEnd"].forEach(function (ev) {
  mp.addListener(ev, function () {
    sys.error(ev+": "+mp.part.boundary);
  });
});
mp.addListener("body", function (c) {
  sys.error("body: "+mp.part.boundary+" "+
    (mp.part.name || mp.part.filename || "") +" "+c.substr(0, 50));
});



var emailBody = fixture.emailBody;
process.nextTick(function s () {
  if (emailBody) {
    emailMessage.emit("body", emailBody.substr(0, 500));
    emailBody = emailBody.substr(500);
    process.nextTick(s);
  } else {
    emailMessage.emit("complete");
  }
});