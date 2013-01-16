// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

/*
 * This is a simple addition to allow for higher resolution timers. It can be
 * used to track time for both synchronous or asynchronous calls. For
 * synchronous calls pass a callback function like so:
 *
 *  var timer = require('./_bench_timer');
 *
 *  timer('myTest', function() {
 *    for (var i = 0; i < 1e6; i++)
 *      // ... run something here
 *    }
 *  });
 *
 * For asynchronous timers just pass the name. Then run it again with the same
 * name to finish it:
 *
 *  timer('checkAsync');
 *  setTimeout(function() {
 *    timer('checkAsync');
 *  }, 300);
 *
 * To use the asynchronous timer for printing itterations over time, pass the
 * number of ms between log intervals you would like to use as the second
 * argument. Then call timer.inc(<name>) to increment the internal counter. If
 * you would like to indicate how many times this counter should log before
 * stopping, pass a third value. If no third value is passed then the counter
 * will automatically stop after receiving three 0 counters in a row:
 *
 *  timer('asyncCounter', 1000);
 *  setInterval(function() {
 *    timer.inc('asyncCounter');
 *  }, 20);
 *
 * When asynchronous counters run all currently queued benchmarks will be
 * paused until the asynchronous benchmark has completed.
 *
 * If the benchmark has been run with --expose_gc then the garbage collector
 * will be run between each test.
 *
 * The setTimeout delay can also be changed by passing a value to timer.delay.
 *
 * Pass arguments to timer.parse() and get back an object with the names of each
 * passed argument.
 *
 * There is one built in argument that will interact directly with the timer.
 * `--run` followed by one or more strings will identify to the timer which
 * tests should be run. All other tests will be dropped. Use like the following:
 *
 *   node my_bench.js --run 'test1' 'test2'
 *
 * Each benchmark should also have a list of all accepted parameters.
 *
 * Note: All benchmark parameters need to start with `--`.
 */


var store = {};
var counter = {};
var counter_info = {};
var order = [];
var runQueue = false;
var maxLength = 0;
var processing = false;
var asyncQueue = 0;
var GCd = typeof gc !== 'function' ? false : true;
var rParse = /^--[^-]/;

function timer(name, fn, times) {
  if (runQueue && !runQueue[name]) return;
  if (typeof fn == 'number') {
    counter[name] = 0;
    counter_info[name] = {
      delay: fn,
      prevz: 0,
      times: typeof times != 'undefined' ? times : -1
    }
    processing = false;
    asyncQueue++;
    setupInterval(name);
  }
  if (maxLength < name.length)
    maxLength = name.length;
  if (!fn) {
    processing = false;
    if (!store[name]) {
      asyncQueue++;
      store[name] = process.hrtime();
      return;
    }
    displayTime(name, process.hrtime(store[name]));
    asyncQueue--;
  } else {
    store[name] = fn;
    order.push(name);
  }
  if (!processing && asyncQueue <= 0) {
    processing = true;
    setTimeout(run, timer.delay);
  }
}

timer.delay = 300;

timer.parse = function(argv) {
  var obj = {};
  var current, i;
  for (i = 2; i < argv.length; i++) {
    if (rParse.test(argv[i])) {
      current = obj[argv[i].substr(2)] = [];
    } else if (current) {
      current.push(argv[i]);
    }
  }
  if (obj.run) {
    runQueue = {};
    for (i = 0; i < obj.run.length; i++)
      runQueue[obj.run[i]] = true;
  }
  if (obj.len) {
    obj.len = parseFloat(obj.len);
    if (!isFinite(obj.len))
      throw RangeError('Pass numeric value for number of iterations');
  } else {
    obj.len = false;
  }
  return obj;
};

timer.inc = function(name) {
  counter[name]++;
};

function run() {
  if (asyncQueue > 0 || order.length <= 0)
    return;
  if (GCd) gc();
  setTimeout(function() {
    var name = order.shift();
    var fn = store[name];
    var ini = process.hrtime();
    fn();
    ini = process.hrtime(ini);
    displayTime(name, ini);
    run();
  }, timer.delay);
}

function setupInterval(name) {
  var val = setInterval(function() {
    var time = Date.now() - counter_info[name].prevtime;
    console.log(name + ': ' +
                (counter[name] / time * 1000).toFixed(2) + '/sec');
    if (counter[name] === 0)
      counter_info[name].prevz++;
    if (counter_info[name].times > 0)
      counter_info[name].times--;
    if (counter_info[name].times === 0 || counter_info[name].prevz > 3)
      return clearInterval(val);
    counter[name] = 0;
    counter_info[name]
    counter_info[name].prevtime = Date.now();
  }, counter_info[name].delay);
  counter_info[name].prevtime = Date.now();
}

function displayTime(name, ini) {
  name += ': ';
  while (name.length < maxLength + 2)
    name += ' ';
  console.log(name + '%s \u00b5s',
              Math.floor((ini[0] * 1e6) + (ini[1] / 1e3))
                .toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
}

module.exports = timer;
