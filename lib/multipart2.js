
var sys = require("sys"),
  events = require("events"),
  wrapExpression = /^[ \t]+/,
  multipartExpression = new RegExp(   
    "^multipart\/(" +
    "mixed|rfc822|message|digest|alternative|" +
    "related|report|signed|encrypted|form-data|" +
    "x-mixed-replace|byteranges)", "i"),
  boundaryExpression = /boundary=([^;]+)/i,
  CRLF = "\r\n",

  // parser states.
  s = 0,
  S_NEW_PART = s++,
  S_HEADER = s++,
  S_BODY = s++,
  S_BODY_BEGIN = s++,
  S_PART_END = s++;

exports.parse = parse;
exports.Stream = Stream;

function parse (message) {
  return new Stream(message);
};

// events:
// "partBegin", "partEnd", "body", "complete"
// everything emits on the Stream directly.
// the stream's "parts" object is a nested collection of the header objects
// check the stream's "part" member to know what it's currently chewin on.
// this.part.parent refers to that part's containing message.
// child messages inherit their parent's headers
// A non-multipart message is treated just as a regular 
function Stream (message) {
  var isMultiPart = multipartHeaders(message, this);
  message.addListener("body", writer(this, isMultiPart));
  message.addListener("complete", ender(this));
};
Stream.prototype = { __proto__ : events.EventEmitter.prototype };

// check the headers of the message.  If it wants to be multipart,
// then we'll be returning true.  Regardless, if supplied, then
// stream will get a headers object that inherits from message's.
// If no stream object is supplied, then this function just inspects
// the message's headers for multipartness.
function multipartHeaders (message, stream) {
  // note: if message isn't actually multipart, then it'll just be wrapped up.
  var field, val, contentType, contentDisposition = "";
  for (var h in message.headers) if (message.headers.hasOwnProperty(h)) {
    val = message.headers[h];
    field = h.toLowerCase();
    if (field === "content-type") {
      contentType = val;
    } else if (field === "content-disposition") {
      contentDisposition = val;
    }
  }
  if (stream && stream !== message) stream.headers = Object.create(message.headers);

  if (!contentType) {
    return false;
  }

  // legacy
  // TODO: Update this when/if jsgi-style headers are supported.
  // this will keep working, but is less efficient than it could be.
  if (!Array.isArray(contentType)) contentType = contentType.split(",");
  contentType = contentType[contentType.length-1];
  if (!Array.isArray(contentDisposition)) contentDisposition = contentDisposition.split(",");
  contentDisposition = contentDisposition[contentDisposition.length - 1];

  var mutate = (stream || message);
  
  if (contentDisposition) {
    var cd = contentDisposition.split(/; */);
    
    cd.shift();
    for (var i = 0, l = cd.length; i < l; i ++) {
      var bit = cd[i].split("="),
        name = bit.shift(),
        val = JSON.parse(bit.join("="));
      if (name === "filename" || name === "name") {
        mutate[name] = val;
      }
    }
  }


  // make sure it's actually multipart.
  var mpType = multipartExpression.exec(contentType);
  if (!mpType) {
    return false;
  }

  // make sure we have a boundary.
  var boundary = boundaryExpression.exec(contentType);
  if (!boundary) {
    return false;
  }
  
  mutate.type = mpType[1];
  mutate.boundary = "--" + boundary[1];
  mutate.isMultiPart = true;
  
  return true;
};
function writer (stream, isMultiPart) {
  // just a wrapper.
  if (!isMultiPart) {
    stream.part = stream;
    stream.type = false;
    return function (chunk) { stream.emit("body", chunk) };
  }

  var buffer = "",
    state = S_NEW_PART,
    part = stream.part = stream,
    parent = stream,
    lastHeader = null;
  stream.parts = [];
  stream.parent = stream;
  return function (chunk) {
    // write to the buffer, and then process the buffer.
    buffer += chunk;
    while (buffer.length > 0) {
      switch (state) {
        case S_NEW_PART:
          // part is a multipart message that knows its boundary.
          // we're processing its body.
          sys.debug("new part "+part.boundary);
          sys.debug("buffer: "+buffer.substr(0, 10));
          boundary = part.boundary;
          var offset = buffer.indexOf(boundary);
          if (offset === -1) {
            // get it on the next pass, perhaps.
            return;
          }
          if (offset > 0) {
            sys.debug("buffer "+buffer);
            sys.debug("boundary "+boundary);
            throw new Error("Malformed: data outside multipart boundary.");
          }
          buffer = buffer.substr(offset + boundary.length);
          // parent = part;
          part = startPart(parent);
          stream.part = part;
          // also chomp off the CRLF
          // end of the line? or start of this one?
          buffer = buffer.substr(CRLF.length);
          state = S_HEADER;
        continue;
        case S_HEADER:
          // cheat a little.
          // look for the end and do it in one go.
          // abort on long headers, but be flexible.
          var headerEnd = buffer.indexOf(CRLF+CRLF);
          if (headerEnd === -1) {
            if (buffer.length < 1024 * 32) {
              throw new Error("Malformed: multipart header unreasonably long.");
            }
            return;
          }
          var headerString = buffer.substr(0, headerEnd);
          parseHeaderString(part.headers, headerString);
          buffer = buffer.substr(headerEnd + (CRLF+CRLF).length);
          state = S_BODY_BEGIN;
        continue;
        case S_BODY_BEGIN:
          // check to see if this part is another multipart message.
          // if it is, then we want to move from here to S_NEW_PART.
          // otherwise, we want to move to S_BODY to start sending chunks.
          var isMultiPart = multipartHeaders(part);

          if (isMultiPart) {
            state = S_NEW_PART;
          } else {
            part.boundary = part.parent.boundary;
            part.type = part.parent.type;
            state = S_BODY;
          }

          // at this point, the part is ready to be processed.
          // also, we know whether it's a nested multipart message or not.
          stream.emit("partBegin");
        continue;
        case S_BODY:
          // emit body chunks up to the boundary.
          offset = buffer.indexOf(part.boundary);
          if (offset === -1) {
            stream.emit("body", buffer);
            buffer = "";
            return;
          }
          if (offset > 0) {
            stream.emit("body", buffer.substr(0, offset));
            buffer = buffer.substr(offset);
          }
          // now buffer starts with the boundary, and this part is through.
          state = S_PART_END;
        continue;
        case S_PART_END:
          stream.emit("partEnd");
          var offset = part.boundary.length,
            end = (buffer.substr(offset, 2) === "--");
          if (end) {
            // this stream of parts is done.
            // back up to the parent and hit this state again.
            sys.debug("end: "+buffer.substr(0,offset+4));
            part = part.parent;
            buffer = buffer.substr(offset + 4);
          } else {
            // chomp the crlf, and start a new sibling part.
            part = part.parent;
            state = S_NEW_PART;
            // buffer = buffer.substr(0, offset);
          }
        continue;
      }
    }
  };
};

function parseHeaderString (headers, string) {
  var lines = string.split(CRLF),
    field, value, line;
  for (var i = 0, l = lines.length; i < l; i ++) {
    line = lines[i];
    if (line.match(wrapExpression)) {
      if (!field) {
        sys.debug(line);
        throw new Error("Malformed. First header starts with whitespace.");
      }
      value += line.replace(wrapExpression, " ");
      continue;
    } else if (field) {
      // now that we know it's not wrapping, put it on the headers obj.
      affixHeader(headers, field, value);
    }
    line = line.split(":");
    field = line.shift().toLowerCase();
    if (!field) {
      throw new Error("Malformed: improper field name.");
    }
    value = line.join(":").replace(/^\s+/, "");
  }
  // now affix the last field.
  affixHeader(headers, field, value);
};

function affixHeader (headers, field, value) {
  if (!headers.hasOwnProperty(field)) {
    headers[field] = value;
  } else if (Array.isArray(headers[field])) {
    headers[field].push(value);
  } else {
    headers[field] = [headers[field], value];
  }
};

function startPart (parent) {
  var part = {
    headers : { __proto__ : parent.headers },
    parent : parent
  };
  parent.parts = parent.parts || [];
  parent.parts.push(part);
  return part;
};

function ender (stream) { return function () {
  stream.emit("complete");
}};












