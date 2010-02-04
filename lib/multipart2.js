
var sys = require("sys"),
  events = require("events"),
  wrapExpression = /^[ \t]+/,
  multipartExpression = new RegExp(   
    "^multipart\/(" +
    "mixed|rfc822|message|digest|alternative|" +
    "related|report|signed|encrypted|form-data|" +
    "x-mixed-replace|byteranges)", "i"),
  boundaryExpression = /boundary=([^;]+)/i,
  CR = "\r",
  LF = "\n",
  CRLF = CR+LF,
  MAX_BUFFER_LENGTH = 16 * 1024,
  
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
      while (buffer.substr(0, 2) === CRLF) buffer = buffer.substr(2);
      switch (state) {
        case S_NEW_PART:
          // part is a multipart message.
          // we're either going to start reading a new part, or we're going to end
          // the current part, depending on whether the boundary has -- at the end.
          var boundary = part.boundary,
            len = boundary.length,
            offset = buffer.indexOf(boundary);
          if (offset === -1) {
            if (buffer.length > MAX_BUFFER_LENGTH) {
              throw new Error("Malformed: boundary not found at start of message");
            }
            // get it on the next pass.
            return;
          }
          if (offset > 0) {
            throw new Error("Malformed: data before the boundary");
          }
          if (buffer.length < (len + 2)) {
            // we'll need to see either -- or CRLF after the boundary.
            // get it on the next pass.
            return;
          }
          if (buffer.substr(len, 2) === "--") {
            // this message is done.
            // chomp off the boundary and crlf and move up
            if (buffer.length < (len + 4) && part !== stream) {
              // wait to see the crlf
              return;
            }
            if (buffer.substr(len+2, 2) !== CRLF && part !== stream) {
              throw new Error("Malformed: CRLF not found after boundary");
            }
            buffer = buffer.substr(len + 4);
            stream.emit("partEnd", part);
            stream.part = part = part.parent;
            state = S_NEW_PART;
            continue;
          }
          if (buffer.length < (len + 2) && part !== stream) {
            // wait to see the crlf
            return;
          }
          if (buffer.substr(len, 2) !== CRLF && part !== stream) {
            throw new Error("Malformed: CRLF not found after boundary");
          }
          // walk past the crlf
          buffer = buffer.substr(len + 2);
          // mint a new child part, and start parsing headers.
          stream.part = part = startPart(part);
          state = S_HEADER;
        continue;
        case S_HEADER:
          // just grab everything to the double crlf.
          var headerEnd = buffer.indexOf(CRLF+CRLF);
          if (headerEnd === -1) {
            if (buffer.length > MAX_BUFFER_LENGTH) {
              throw new Error("Malformed: header unreasonably long.");
            }
            return;
          }
          var headerString = buffer.substr(0, headerEnd);
          buffer = buffer.substr(headerEnd + 4); // chomp off the header and the empty line.
          parseHeaderString(part.headers, headerString);
          multipartHeaders(part);
        
          // let the world know
          stream.emit("partBegin", part);
        
          if (part.isMultiPart) {
            // it has a boundary and we're ready to grab parts out.
            state = S_NEW_PART;
          } else {
            // it doesn't have a boundary, and is about to start spitting out body bits.
            state = S_BODY;
          }
        continue;
        case S_BODY:
          // look for part.parent.boundary
          var boundary = part.parent.boundary,
            offset = buffer.indexOf(boundary);
          if (offset === -1) {
            // emit and wait for more data, but be careful, because
            // we might only have half of the boundary so far.
            // make sure to leave behind the boundary's length, so that we'll
            // definitely get it next time if it's on its way.
            var emittable = buffer.length - boundary.length;
            if (buffer.substr(-1) === CR) emittable -= 1;
            if (buffer.substr(-2) === CRLF) emittable -= 2;
            
            if (emittable > 0) {
              stream.emit("body", buffer.substr(0, emittable));
              buffer = buffer.substr(emittable);
            }
            // haven't seen the boundary, so wait for more bytes.
            return;
          }
          if (offset > 0) {
            var emit = buffer.substr(0, offset);
            if (emit.substr(-2) === CRLF) emit = emit.substr(0, emit.length-2);
            if (emit) stream.emit("body", emit);
            buffer = buffer.substr(offset);
          }
        
          // let em know we're done.
          stream.emit("partEnd", part);
        
          // now buffer starts with boundary.
          if (buffer.substr(boundary.length, 2) === "--") {
            // message end.
            // parent ends, look for a new part in the grandparent.
            stream.part = part = part.parent;
            stream.emit("partEnd", part);
            stream.part = part = part.parent;
            state = S_NEW_PART;
            buffer = buffer.substr(boundary.length + 4);
          } else {
            // another part coming for the parent message.
            stream.part = part = part.parent;
            state = S_NEW_PART;
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












