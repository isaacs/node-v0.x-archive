var rates = [];

var cli = {
  onend: function() {
    process.stdout.write(new Buffer(printComplete()));
  },
  oninterval:function(name, hrtime, counter) {
    var elapsed = hrtime[0] * 1e9 + hrtime[1];
    var bits = counter * 8;
    var gbits = bits / 0x40000000;
    var rate = gbits / elapsed * 1e9;
    rates.push(rate);
    var buf = new Buffer(rate.toFixed(2) + ' Gb/sec ' +
                         ~~(bits / 1024) + ' kb / ' +
                         ~~(elapsed / 1e3) + ' \u00b5s\n');
    process.stdout.write(buf);
  }
};

var make = {
  onend: function(name) {
    while (name.length < 20)
      name += ' ';
    process.stdout.write(new Buffer(name + ' : ' + printComplete()));
  },
  oninterval: function(name, hrtime, counter) {
    var elapsed = hrtime[0] * 1e9 + hrtime[1];
    var bits = counter * 8;
    var gbits = bits / 0x40000000;
    var rate = gbits / elapsed * 1e9;
    rates.push(rate);
  }
};

function printComplete() {
  rates.sort();
  var min = rates[0];
  var max = rates[rates.length - 1];
  var median = rates[rates.length >> 1];
  var avg = 0;
  rates.forEach(function(rate) { avg += rate });
  avg /= rates.length;
  return 'min: ' + min.toPrecision(5) +
      '   avg: ' + avg.toPrecision(5) +
      '   max: ' + max.toPrecision(5) +
      '   med: ' + median.toPrecision(5) + '\n';
}




module.exports = {
  cli: cli,
  make: make
};
