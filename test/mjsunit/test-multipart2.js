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
    sys.error(ev+": "+(mp.part.boundary || mp.part.filename ||
        JSON.stringify(mp.part.headers)));
  });
});
// mp.addListener("body", function (c) {
//   sys.error("body: "+
//     (mp.part.name || mp.part.filename || "") +" "+JSON.stringify(c));
// });



var emailBody = fixture.emailBody,
  chunkSize = 1;
process.nextTick(function s () {
  if (emailBody) {
    emailMessage.emit("body", emailBody.substr(0, chunkSize));
    emailBody = emailBody.substr(chunkSize);
    process.nextTick(s);
  } else {
    emailMessage.emit("complete");
  }
});