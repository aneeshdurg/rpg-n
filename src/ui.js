// Module UI
import ExFunc from './exfunc.js';

export const NO_ACTION = Symbol('NO_ACTION');
export const UNREACHABLE = Symbol('UNREACHABLE');
export const WAIT_FOR_CLICK = Symbol('WAIT_FOR_CLICK');

var _parent = null;
var _main_display = null;
var _main_display_img = null;
var _textbox = null;
export function initialize(parent) {
  _parent = document.createElement('div');
	_parent.style.width = "100%";
	_parent.style.height = "100%";
  _parent.id = "rpgn-parent";
  parent.appendChild(_parent);

  _main_display = document.createElement('div');
  _main_display.id = "rpgn-main_display";
	_main_display.style.width = "90%";
	_main_display.style.height = "70%";
	_main_display.style.position = "absolute";
	_main_display.style.left = 0;
	_main_display.style.right = 0;
	_main_display.style.margin = "auto";
	_main_display.style.background = "black";
	_main_display.style.backgroundSize = "100% 100%";
  _main_display.style.transition = "background-image 1s linear";

  _main_display_img = document.createElement('img');
  _main_display_img.style.width = "100%";
  _main_display_img.style.height = "100%";

  _main_display.appendChild(_main_display_img);

  _textbox = document.createElement('div');
  _textbox.id = "rpgn-textbox";
  _textbox.style.width = "90%";
	_textbox.style.height = "25%";
	_textbox.style.position = "absolute";
	_textbox.style.bottom = 0;
	_textbox.style.left = 0;
	_textbox.style.right = 0;
	_textbox.style.margin = "auto";
	_textbox.style.border = "5px solid #0000cc";

  _parent.appendChild(_main_display);
  _parent.appendChild(_textbox);
}

function _get_duration_string(duration) {
  var duration = duration || "500ms";
  if (typeof(duration) != 'string') {
    duration = String(duration) + 'ms';
  }

  return duration;
}

async function do_animation_single(element, animation_name, duration) {
  var duration = _get_duration_string(duration);

  var animation_resolver = null;
  var animation_done = new Promise((r) => { animation_resolver = r; });
  var old_duration = _main_display_img.style.animationDuration;

  function event_listener() {
    element.removeEventListener('animationend', event_listener);
    element.style.animationDuration = old_duration;
    element.className = "";
    animation_resolver();
  }
  element.addEventListener('animationend', event_listener);

  element.className = "";
  element.style.animationDuration = duration;
  element.style.animationDelay = "";
  element.style.animationIterationCount = "";
  element.classList.add("animated", animation_name);

  return animation_done;
}

export function clearScene(duration) {
  return new Action(async function() {
    await do_animation_single(_main_display_img, "fadeOut", duration);
    _main_display_img.src = "";
  });
}

// takes in a variadic list of Action's
export function Scene() {
}

export function NewScene() {
  clearScene().run();
  Scene.apply(this, arguments);
}

export function CombatScene(player_sprite, enemy_sprite) {}

export function setBackground(path, duration) {
  return new Action(async function() {
    var resolver = null;
    var loaded = new Promise((r) => { resolver = r; });
    _main_display_img.onload = function() {
      resolver();
    }

    _main_display_img.src = path;
    await loaded;

    await do_animation_single(_main_display_img, "fadeIn", duration);
    return;
  });
}

// These functions return an action that can be executed by a scene
function RunGame() {};
function RunGameUntil() {};
function Exec() {};
function SetBackground() {};
function Jump() {};
function Choice() {};

// A stack of sprites that can be manipulated
class SpriteStack extends Array {}

// A class representing an action that a scene should evaluate.
class Action {
  constructor(callback) {
    if (!(callback instanceof Function)) {
      throw new Error("Callback was not a function");
    }
    this.callback = callback;
  }

  run() {
    return this.callback();
  }
}

// This class should be a wrapper around animate.css and css.shake
class Draw {
  constructor() {}
}

// This class contains methods to help a scene format text
class Text {}

export function dbg_get__main_display_img() {
  return _main_display_img;
}
