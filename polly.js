(function (name, root, factory) {
  if (typeof exports == 'object') {
    module.exports = factory();
  } else if (typeof define == 'function' && define.amd) {
    define(factory);
  } else {
    root[name] = factory();
  }
}("polly", this, function () {

  "use strict";

  var time, intervalId;
  var steps = [];
  var template = '<a data-polly-action="record" href="#">record</a> ' +
                 '<a data-polly-action="run" href="#">run</a>';

  var recording = false;
  var running = false;

  var recordEl, runEl;
  var events = 'click keypress change'.split(' ');

  var eventMap = {
    'Event': {
      name: 'HTMLEvents',
      fn: 'initEvent',
      args: ['type', 'canBubble', 'cancelable']
    },
    'KeyboardEvent': {
      name: 'KeyboardEvent',
      fn: 'initKeyboardEvent',
      args: [ 'type', 'canBubble', 'cancelable',
              'view', 'keyCode', 'charCode', 'keyLocation' ]
    },
    'MouseEvent': {
      name: 'MouseEvent',
      fn: 'initMouseEvent',
      args: [ 'type', 'canBubble', 'cancelable',
        'view', 'detail', 'screenX',
        'screenY', 'clientX', 'clientY', 'ctrlKey',
        'altKey', 'shiftKey', 'metaKey', 'button' ]
    }
  };

  var simulateFilters = {
    keypress: function (el, step) {
      el.value += String.fromCharCode(step.keyCode);
    },

    change: function (el, step) {
      if (step.value) {
        el.value = step.value;
      }
    }
  };

  var captureFilters = {
    change: function (event, step) {
      var el = event.target;
      step.value = el.value;
      step.index = el.selectedIndex;
    }
  };


  function init() {
    var div = document.createElement('div');
    div.innerHTML = template;
    div.style.cssText = 'position: absolute; top: 0px; right: 5px;';
    document.body.appendChild(div);

    recordEl = document.querySelector('[data-polly-action=record]');
    runEl = document.querySelector('[data-polly-action=run]');

    recordEl.addEventListener('click', toggleRecord, false);
    runEl.addEventListener('click', toggleRun, false);
  }

  function toggleRecord(e) {
    recording = !recording;
    var fn = (recording) ? record : stopRecording;
    fn();
  }

  function record() {
    recording = true;
    steps = [];
    recordEl.innerHTML = 'stop';
    on();
  }

  function stopRecording() {
    recording = false;
    recordEl.innerHTML = 'record';
    off();
  }

  function toggleRun() {
    running = !running;

    if (running) {
      runEl.innerHTML = 'stop';
      stop();
      run(steps.slice(0));
    }
    else {
      stopRunning();
    }
  }

  function stopRunning() {
    running = false;
    runEl.innerHTML = 'run';
  }

  function run(steps) {
    if (steps.length == 0 || !running) {
      stopRunning();
      return;
    }

    var step = steps.shift();

    clearInterval(intervalId);
    intervalId = setTimeout(function () {
      simulate(step);
      run(steps);
    }, step.time);
  }

  function on() {
    events.forEach(function (event) {
      document.addEventListener(event, capture, true);
    });
  }

  function off() {
    events.forEach(function (event) {
      document.removeEventListener(event, capture, true);
    });
  }

  function capture(e) {
    var attr = e.target.getAttribute('data-polly-action');
    if (attr) return;

    time = time || Date.now();

    var now = Date.now();
    var name = getName(e);
    e.view = '';

    var step = copy({}, e, eventMap[name].args);

    step.name = name;
    step.time = now - time;
    step.path = getElementXPath(e.target);

    captureFilters[step.type] && captureFilters[step.type](e, step);

    time = now;
    steps.push(step);
  }

  function simulate(step) {
    var eventAttrs = eventMap[step.name];
    var event = document.createEvent(eventAttrs.name);
    var el = getElementByXPath(step.path);

    event[eventAttrs.fn].apply(event, objToArray(step, eventAttrs.args));
    el.focus();

    simulateFilters[step.type] && simulateFilters[step.type](el, step);
    el.dispatchEvent(event);
  }

  // helpers

  function getElementXPath(element) {
    if (element && element.id) {
      return '//*[@id="' + element.id + '"]';
    }
    else {
      return getElementTreeXPath(element);
    }
  }

  function getElementByXPath(path) {
    var result = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
  };

  function getElementTreeXPath(element) {
    var paths = [];

    for (; element && element.nodeType == 1; element = element.parentNode) {
      var index = 0;

      for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName == element.nodeName) ++index;
      }

      var tagName = element.nodeName.toLowerCase();
      var pathIndex = (index ? "[" + (index+1) + "]" : "");

      paths.splice(0, 0, tagName + pathIndex);
    }

    return paths.length ? "/" + paths.join("/") : null;
  }

  function getName(obj) {
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((obj).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
  }

  function copy(dest, src, attrs) {
    attrs || (attrs = {});

    for (var key in src) {
      if (attrs.indexOf(key) > -1) {
        if (typeof src[key] == "object") {
          dest[key] = '';
        }
        else {
          dest[key] = src[key];
        }
      }
    }

    return dest;
  }

  function objToArray(src, attrs) {
    var arr = [];

    for (var i = 0, l = attrs.length; i < l; i++) {
      arr.push(src[attrs[i]]);
    }

    return arr;
  }

  return { init: init };

}));
