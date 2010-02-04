
var sys = require("sys"),
  events = require("events"),
  multipartExpression = new RegExp(   
    "^multipart\/(" +
    "mixed|rfc822|message|digest|alternative|" +
    "related|report|signed|encrypted|form-data|" +
    "x-mixed-replace|byteranges)", "i"),
  boundaryExpression = /boundary=([^;]+)/i;

exports.parse = function (message) {
  return new (Stream(message));
};

exports.Stream = Stream;
function Stream (message) {
  // non-multipart messages just get returned as-is.
  // that allows this to be wrapped around messages
  // without having to know whether or not they're
  // actually multipart.
  if (!parseHeaders(this, message)) return message;

  events.EventEmitter.call(this);

  this.init(message);
};

function parseMessage (stream, message) {
  var field, val, contentType, contentLength;
  for (var h in message.headers) {
    val = message.headers[h];
    field = h.toLowerCase();
    if (field === "content-type") {
      contentType = val;
    } else if (field === "content-length") {
      contentLength = val;
    }
  }

  // content type is required.
  if (!contentType) return false;

  // legacy
  // TODO: Update this when/if jsgi-style headers are supported.
  // this will keep working, but is less efficient than it could be.
  if (!Array.isArray(contentType)) contentType = contentType.split(",");
  contentType = contentType[contentType.length];

  // make sure it's actually multipart.
  var mpType = multipartExpression.exec(contentType);
  if (!mpType) return false;

  // make sure we have a boundary.
  var boundary = boundaryExpression.exec(contentType);
  if (!boundary) return false;

  stream.type = mpType[1];
  stream.boundary = "--" + boundary[1];

  if (contentLength && !isNaN(contentLength)) {
    stream.bytesTotal = +contentLength;
  } else {
    stream.bytesTotal = Infinity;
  }
  return true;
};

var proto = Stream.prototype = Object.create(events.EventEmitter.prototype);
proto.constructor = Stream;

proto.init = function (message) {
  this.buffer = "";
  this.bytesReceived = 0;
  this.bytesTotal = 0;
  this.part = null;
  this.headers = Object.create(message.headers);

  if (message.body && !message.addListener) {
    this.write(message.body);
    return;
  }

  // TODO: use the stream api semantics.
  // s/body/data/
  // s/complete/end/
  var self = this;
  message.addListener("body", function (chunk) { self.write(chunk) });
  message.addListener("complete", function () { self.emit("complete") });
};

proto.write = function(chunk) {
  var received = chunk.length + this.bytesReceived;
  if (received > this.bytesTotal) {
    chunk = chunk.substr(0, this.bytesTotal - this.bytesReceived);
  }
  if (!chunk) return;

  this.bytesReceived += chunk.length;
  this.buffer = this.buffer + chunk;

  while (this.buffer.length) {
    var offset = this.buffer.indexOf(this.boundary);

    if (offset === 0) {
      this.buffer = this.buffer.substr(offset + this.boundary.length + 2);
    } else if (offset == -1) {
      if (this.buffer === "\r\n") {
        this.buffer = "";
      } else {
        this.part = (this.part || new Part(this));
        this.part.write(this.buffer);
        this.buffer = "";
      }
    } else if (offset > 0) {
      this.part = (this.part || new Part(this));
      this.part.write(this.buffer.substr(0, offset - 2));

      this.part.emit("complete");

      this.part = new Part(this);
      this.buffer = this.buffer.substr(offset + this.boundary.length + 2);
    }
  }
};

function parseSubHeaders (headers) {
  var subHeaders = {};
  for (var header in headers) {
    var parts = headers[header].split(/; ?/),
      parsedHeader = {};
    for (var i = 0, l = parts.length; i < l; i++) {
      var pair = parts[i].split("=");
      if (pair.length < 2) continue;
      var key = pair.shift().toLowerCase(),
        val = pair.join("=");
      val = stripslashes(val).substr(1);
      val = val.substr(0, val.length - 1);
      parsedHeader[key] = val;
    }
    subHeaders[header] = parsedHeader;
  }
  return subHeaders;
};

function Part(stream) {
  events.EventEmitter.call(this);

  this.headers = {};
  this.name = null;
  this.filename = null;
  this.buffer = "";
  this.bytesReceived = 0;

  // Avoids turning Part into a circular JSON object
  this.getStream = function() {
    return stream;
  };

  this._headersComplete = false;
}
Part.prototype = Object.create(events.EventEmitter.prototype);

Part.prototype.write = function(chunk) {
  if (this._headersComplete) {
    this.bytesReceived = this.bytesReceived + chunk.length;
    this.emit("body", chunk);
    return;
  }

  this.buffer = this.buffer + chunk;
  while (this.buffer.length) {
    var offset = this.buffer.indexOf("\r\n");

    if (offset === 0) {
      // done with headers.
      this._headersComplete = true;

      // pull out the bits we care about.
      this.subHeaders = parseSubHeaders(this.headers);
      var disp = this.subHeaders["content-disposition"] || {};
      this.name = disp.name || null;
      this.filename = disp.filename || null;

      // part headers override the parent headers.
      // but inherit stuff that isn't multipart-related.
      this.headers.__proto__ = this.getStream().headers;

      this.getStream().emit("part", this);

      this.buffer = this.buffer.substr(2);
      this.bytesReceived = this.bytesReceived + this.buffer.length;
      this.emit("body", this.buffer);
      this.buffer = "";
      return;
    } else if (offset > 0) {
      var header = this.buffer.substr(0, offset).split(/: ?/),
        field = header[0].toLowerCase(),
        value = header[1];

      if (!this.headers[field]) {
        this.headers[field] = value;
      } else if (Array.isArray(this.headers[field])) {
        this.headers[field].push(value);
      } else {
        this.headers[field] = [this.headers[field], value];
      }
      this.buffer = this.buffer.substr(offset+2);
    } else if (offset === -1) {
      return;
    }
  }
};

function stripslashes(str) {
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +      fixed by: Mick@el
  // +   improved by: marrtins
  // +   bugfixed by: Onno Marsman
  // +   improved by: rezna
  // +   input by: Rick Waldron
  // +   reimplemented by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: stripslashes("Kevin\'s code");
  // *     returns 1: "Kevin's code"
  // *     example 2: stripslashes("Kevin\\\'s code");
  // *     returns 2: "Kevin\'s code"
  return (str+"").replace(/\\(.?)/g, function (s, n1) {
    switch(n1) {
      case "\\":
        return "\\";
      case "0":
        return "\0";
      case "":
        return "";
      default:
        return n1;
    }
  });
}
