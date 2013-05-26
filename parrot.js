(function (name, root, factory) {
  if (typeof exports == 'object') {
    module.exports = factory();
  } else if (typeof define == 'function' && define.amd) {
    define(factory);
  } else {
    root[name] = factory();
  }
}("parrot", this, function () {

  "use strict";

  var time, intervalId;
  var steps = [];
  var template = '<a data-parrot-action="startstop" href="#">record</a> ' +
                 '<a data-parrot-action="play" href="#">play</a>';

  var recording = false;
  var playing = false;

  var startEl, playEl;

  var events = 'click keypress'.split(' ');

  function init() {
    var div = document.createElement('div');
    div.innerHTML = template;
    div.style.cssText = 'position: absolute; top: 0px; right: 5px;';
    document.body.appendChild(div);

    startEl = document.querySelector('[data-parrot-action=startstop]');
    playEl = document.querySelector('[data-parrot-action=play]');

    startEl.addEventListener('click', startStop, false);
    playEl.addEventListener('click', play, false);
  }

  function startStop(e) {
    recording = !recording;
    var fn = (recording) ? start : stop;
    fn();
  }

  function start() {
    recording = true;
    steps = [];
    startEl.innerHTML = 'stop';
    on();
  }

  function stop() {
    recording = false;
    startEl.innerHTML = 'record';
    off();
  }

  function play() {
    playing = !playing;
    if (playing) {
      playEl.innerHTML = 'stop';
      stop();
      run(steps.slice(0));
    }
    else {
      stopPlaying();
    }
  }

  function stopPlaying() {
    playing = false;
    playEl.innerHTML = 'play';
  }

  function run(steps) {
    if (steps.length == 0 || !playing) {
      stopPlaying();
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
      document.addEventListener(event, record, true);
    });
  }

  function off() {
    events.forEach(function (event) {
      document.removeEventListener(event, record, true);
    });
  }

  function record(e) {
    var attr = e.target.getAttribute('data-parrot-action');
    if (attr) return;

    time = time || Date.now();
    var now = Date.now();
    var name = getName(e);
    var step = (name == "KeyboardEvent") ?
      recordKeyboardEvent(e) :
      recordMouseEvent(e);

    step.cancelBubble = e.cancelBubble,
    step.cancelable = e.cancelable,
    step.detail = e.detail,
    step.type = e.type;
    step.name = name;
    step.time = now - time;
    step.path = getElementXPath(e.target);

    time = now;
    steps.push(step);
  }

  function recordKeyboardEvent(e) {
    return {
      keyCode: e.keyCode,
      charCode: e.charCode,
      keyLocation: e.keyLocation,
    };
  }

  function recordMouseEvent(e) {
    return {
      detail: e.detail,
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: e.clientX,
      clientY: e.clientY,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      button: e.button
    };
  }

  function simulate(step) {
    var event = (step.name == "KeyboardEvent") ?
      simulateKeyboardEvent(step) :
      simulateMouseEvent(step);

    var el = getElementByXPath(step.path);
    el.focus();
    el.value += String.fromCharCode(step.keyCode);
    el.dispatchEvent(event);
  }

  function simulateKeyboardEvent(step) {
    var event = document.createEvent('KeyboardEvent');

    event.initKeyboardEvent(
      step.type,
      step.canBubble,
      step.cancelable,
      document.defaultView,
      step.keyCode,
      step.keyCode,
      step.keyLocation,
      "",
      false,
      "");

    return event;
  }

  function simulateMouseEvent(step) {
    var event = document.createEvent('MouseEvent');

    event.initMouseEvent(
      step.type,
      step.canBubble,
      step.cancelable,
      document.defaultView,
      step.detail,
      step.screenX,
      step.screenY,
      step.clientX,
      step.clientY,
      step.ctrlKey,
      step.altKey,
      step.shiftKey,
      step.metaKey,
      step.button,
      null);

    return event;
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

  return { init: init };

}));
