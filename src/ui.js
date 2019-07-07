import Typed from './typed/typed.js';

// Module UI
export const NO_ACTION = Symbol('NO_ACTION');
export const UNREACHABLE = Symbol('UNREACHABLE');
export const WAIT_FOR_CLICK = Symbol('WAIT_FOR_CLICK');

var _parent = null;
var _main_display = null;
var _main_display_img = null;
var _textbox = null;
var _state = {
  hijacker: null,
  waiting_for_clicks: null,
};

export function initialize(parent) {
  _parent = document.createElement('div');
	_parent.style.width = "100%";
	_parent.style.height = "100%";
  _parent.id = "rpgn-parent";
  _parent.onclick = _register_click_event;
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

export function clearScene(duration) {
  return new Action(async function() {
    await Draw.do_animation(_main_display_img, "fadeOut", {"duration": duration});
    _main_display_img.src = "";
  });
}

function reset_textbox() {
  _textbox.innerHTML = "";
}

async function handle_text(text) {
  var resolver = null;
  var typing_done = new Promise((r) => { resolver = r; });
  var p = document.createElement('p');
  _textbox.appendChild(p);
  var typed = new Typed(p, {
    strings: [text],
    showCursor: false,
    typeSpeed: 40, // TODO make this customizable
    onComplete: resolver,
    onDestroy: resolver,
  });

  function kill_typer() {
    typed.destroy();
    p.innerHTML = text;
  }
  _state.hijacker = kill_typer;

  await typing_done;
  _state.hijacker = null;
}

// takes in a variadic list of Action's
export async function Scene() {
  for (var action of arguments) {
    if (action instanceof Action) {
      await action.run();
    } else if (typeof(action) == 'string') {
      reset_textbox(action);
      await handle_text(action);
      await _wait_for_click();
    } else {
      throw new Error("Unexpected argument");
    }
  }
}

export async function NewScene() {
  await clearScene().run();
  return Scene.apply(this, arguments);
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

    await Draw.do_animation(_main_display_img, "fadeIn", {"duration": duration});
    return;
  });
}

function exec(callback) { return new Action(callback); };

// These functions return an action that can be executed by a scene
function runGame() {};
function runGameUntil() {};
function choice() {};

function jump() {};

// A stack of sprites that can be manipulated
export var idk = null;
export class SpriteStack extends Array {
  check_type_error(element) {
    if (!(element instanceof SpriteThunk)) {
      throw new Error("SpriteStack only accepts elements of type SpriteThunk");
    }
  }

  push(element) {
    this.check_type_error(element);
    super.push(element);
    return element;
  }

  unshift(element) {
    this.check_type_error(element);
    super.unshift(element);
    return element;
  }
}
export var spriteStack = new SpriteStack();

// A class representing an action that a scene should evaluate.
export class Action {
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

export class SpriteThunk extends Action {
  constructor(img, callback) {
    super(callback);
    this.element = img;
  }
}

// This class should be a wrapper around animate.css and css.shake

export class Draw {
  constructor() {}

  static _get_duration_or_delay_string(duration) {
    var duration = duration || "";
    if (typeof(duration) != 'string') {
      duration = String(duration) + 'ms';
    }

    return duration;
  }

  static remove_animations(element) {
    element.style.animationDelay = "";
    element.style.animationDuration = "";
    element.style.animationIterationCount = "";
    element.className = "";
  }

  static cancel_animations(element) {
    Draw.remove_animations(element);
    element.dispatchEvent(new Event('animationend'));
  }

  static async do_animation(element, animation_name, params) {
    params = params || {
      "duration": "",
      "delay": "",
      "iterationCount": ""
    };

    var duration = Draw._get_duration_or_delay_string(params.duration);
    var delay = Draw._get_duration_or_delay_string(params.delay);
    var iterationCount = params.iterationCount;

    var animation_resolver = null;
    var animation_done = new Promise((r) => { animation_resolver = r; });

     function event_listener() {
       element.removeEventListener('animationend', event_listener);
       Draw.remove_animations(element);
       animation_resolver();
    }
    element.addEventListener('animationend', event_listener);

    element.className = "";
    element.style.animationDuration = duration;
    element.style.animationDelay = delay;
    element.style.animationIterationCount = iterationCount;
    element.classList.add("animated", animation_name);

    return animation_done;
  }

  static _set_style(element, style) {
    for (var key of Object.keys(style)) {
      element.style[key] = style[key];
    }
  }

  /**
   * img_params, animation, animation_params are optional
   */
  static async draw(image_src, position, img_params, animation, animation_params) {
    var img = document.createElement('img');
    var resolver = null;
    var img_loaded = new Promise((r) => { resolver = r; });
    img.src = image_src;
    img.onload = function() {
      resolver();
    }

    await img_loaded;
    async function callback() {
      Draw._set_style(img, position);
      if (img_params)
        Draw._set_style(img, img_params);

      _main_display.appendChild(img);

      if (animation)
        await Draw.do_animation(img, animation, animation_params);
    }
    return new SpriteThunk(img, callback);
  }
}

// This class contains methods to help a scene format text
export class Text {}

export class Dialogue {
  render(text) {
    // returns an HTML string describing how the text should be formatted
  }
}

function _register_click_event(e) {
  if (_state.hijacker) {
    _state.hijacker(e);
    _state.hijacker = null;
  } else if (_state.waiting_for_clicks) {
    _state.waiting_for_clicks();
    _state.waiting_for_clicks = null;
  } else {
    // cancel animations
    var animated = document.querySelectorAll('.animated');
    for (var el of animated) {
      Draw.cancel_animations(el);
    }
  }
}

async function _wait_for_click() {
  var p = new Promise((r) => {
    _state.waiting_for_clicks = r;
  });
  await p;
}

export function dbg_get__main_display_img() {
  return _main_display_img;
}

export function dbg_get__main_display() {
  return _main_display;
}

export function dbg_get__textbox() {
  return _textbox;
}
