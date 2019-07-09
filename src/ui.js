import Typed from './typed/typed.js';
import {History, HistoryItem} from './game.js';

// Module UI
export const NO_ACTION = Symbol('NO_ACTION');
export const UNREACHABLE = Symbol('UNREACHABLE');
export const WAIT_FOR_CLICK = Symbol('WAIT_FOR_CLICK');
export const EXECUTED_SCENE = Symbol('EXECUTED_SCENE');

// TODO implement pause + save menu

var _parent = null;
var _main_display = null;
var _main_display_img = null;
var _textbox = null;
var _state = {
  hijacker: null,
  waiting_for_clicks: null,
};

var _scene_map = new Map();

export function initialize(parent, scene_list) {
  document.body.style.MozUserSelect="none";
  document.body.style.userSelect="none"

  _parent = document.createElement('div');
  _parent.classList.add("rpgn-parent");
  _parent.onclick = _register_click_event;
  parent.appendChild(_parent);

  _main_display = document.createElement('div');
  _main_display.classList.add("rpgn-main_display");

  _textbox = document.createElement('div');
  _textbox.classList.add("rpgn-textbox");

  _parent.appendChild(_main_display);
  _parent.appendChild(_textbox);

  for (var scene of scene_list) {
    if (_scene_map.get(scene.name)) {
      throw new Error("Scene name '" + scene.name + "' is already taken! Please use unique names!");
    }
    _scene_map.set(scene.name, scene);
  }
}

function apply_background_style(element) {
  element.style.width = "100%";
  element.style.height = "100%";
  element.style.display = "";
}

// TODO allow fading out audio
// TODO allow a fixed number of iterations of audio
export function playAudio(audio, params) {
  params = params || {};

  var resolver = null;
  var audio_done = new Promise((r) => { resolver = r; });

  function callback() {
    if (params.loop) {
      audio.loop = true;
    } else {
      audio.loop = false;
    }

    if (!params.noReset) {
      audio.currentTime = 0;
    }

    audio.onended = function() { resolver(); };
    audio.play();

    return audio_done;
  }

  if (params.asynchronous) {
    return new AsynchronousAction(callback);
  } else {
    return new Action(callback);
  }
}

function pause_all_audio() {
  for (var a of document.querySelectorAll('audio')) {
    a.pause();
  }
}

export function clearScene(duration) {
  return new Action(async function() {
    if (duration)
      await Draw.do_animation(_main_display_img, "fadeOut", {"duration": duration});

    pause_all_audio();
    spriteStack.destroy();

    if (_main_display_img) {
      _main_display_img.remove();
      _main_display_img.style.display = "";
      _main_display_img = null;
    }

    _textbox.innerHTML = "";
    //TODO redesign how the spriteStack is passed around
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

// TODO decide if this should manage it's own spritestack
// TODO decide if it should subclass Action
export class Scene {
  constructor(params) {
    this.name = params.name;
    this.cleanup = Boolean(params.cleanup);
    this.contents = params.contents;
  }

  async handle_action(game, action, idx) {
    var res = null;
    if (action instanceof AsynchronousAction)
      res = {"promise": action.run()};
    else
      res = await action.run();

    if (action instanceof Choice) {
      if (res == null) {
        return null;
      } else if (res instanceof ChoiceResult) {
        // TODO consider refactoring this to append res to an array so that we
        // function.
        var next_scene = _scene_map.get(res.scene_name);
        if (!next_scene) {
          throw new Error("Could not find scene '" + res.scene_name + "'");
        }

        game.history.push(HistoryItem.choice(this.name, idx, res.id));
        await next_scene.run(game);
        return EXECUTED_SCENE;
      } else {
        throw new Error("Expected an instance of ui.ChoiceResult");
      }
    }

    return res;
  }

  async _scene(game, actions) {
    for (var idx in actions) {
      var action = actions[idx];
      game.history.push(HistoryItem.scene_progress(this.name, idx));

      if (action instanceof Action) {
        var res = await this.handle_action(game, action, idx);
        if (res == EXECUTED_SCENE)
          return;
      } else if (typeof(action) == 'string') {
        reset_textbox();
        await handle_text(action);
        await _wait_for_click();
      } else if (action instanceof Sequence) {
        reset_textbox();
        while (!action.done) {
          var val = await action.get();
          if (typeof(val) == 'string') {
            await handle_text(val);
            await _wait_for_click();
          } else if (val instanceof Action) {
            var res = await this.handle_action(game, val, idx);
            if (res == EXECUTED_SCENE)
              return;
          }
        }
      } else {
        throw new Error("Unexpected argument");
      }
    }
  }

  async run(game) {
    game.save();

    if (this.cleanup) {
      await clearScene().run();
    }
    var contents = await this.contents();
    // TODO validate that contents is array of Actions or strings
    return this._scene(game, contents);
  }
};


export class CombatScene extends Scene {}
//export function CombatScene(player_sprite, enemy_sprite) {}

export function setBackground(element, duration) {
  return new Action(async function() {
    element.remove();
    apply_background_style(element);
    _main_display.insertBefore(element, _main_display.childNodes[0]);
    _main_display_img = element;

    await Draw.do_animation(_main_display_img, "fadeIn", {"duration": duration});
  });
}

function exec(callback) { return new Action(callback); };

// These functions return an action that can be executed by a scene
function runGame() {};
function runGameUntil() {};

export function jump(next) {
  // A "Choice" with no branches
  return new Choice(function() {
    return new ChoiceResult(next, -1);
  });
};

export function choice() {
  var choices = arguments;
  return new Choice(async function() {
    var resolver = null;
    var choice_chosen = new Promise((r) => { resolver = r; });
    var chosen_action = null;
    var chosen_idx = -1;
    for (var idx in choices) {
      var choice = choices[idx]
      // choice[0] == choice text
      // choice[1] == choice action or NO_ACTION
      // TODO use mousetrap for keyboard support
      var b = document.createElement('button');
      b.className = "choiceButton";
      b.innerHTML = choice[0];
      function _gen_callback(callback, idx) {
        return function () {
          resolver();
          chosen_action = callback;
          chosen_idx = idx;
        };
      }
      b.onclick = _gen_callback(choice[1], idx);

      _textbox.appendChild(b);
      _textbox.appendChild(document.createElement('br'));
    }

    await choice_chosen;
    if (chosen_action == NO_ACTION) {
      return null;
    }

    return new ChoiceResult(chosen_action, chosen_idx);
  });
};

// A stack of sprites that can be manipulated
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

  get(index) {
    if (index >= 0 && index < this.length) {
      return this[index].element;
    } else if (index < 0 && (-1 * index) <= this.length) {
      return this[this.length + index].element;
    }
  }

  destroy() {
    while (this.length)
      this.pop().element.remove();
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

  // TODO think about chaining events and text
  //and(next_action) {
  //  if (next_action instanceof Action || typeof(next_action) == 'string') {
  //    this.and = next_action;
  //  }
  //}

  run() {
    return this.callback();
  }
}

// No different from a normal action but is just a tag that this action prefers not to be waited on
export class AsynchronousAction extends Action {}

// TODO remove spriteThunk
export class SpriteThunk extends Action {
  constructor(img, callback) {
    super(callback);
    this.element = img;
  }
}

class Choice extends Action {};
class ChoiceResult {
  constructor(scene_name, id) {
    this.scene_name = scene_name;
    this.id = id;
  }
};


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

  /**
   * params is an object defining some of the following properties:
   *  asynchronous - when false, blocks until the animtion is over
   *  delay - when provided the delay until the animation begins
   *  duration - duration of the animation
   *  iterationCount - number of times to repeat the animation (or "infinite")
   *  noCancel - when true, clicking will not cancel the animation
   */
  static animate(element, animation_name, params) {
    function callback() {
          return Draw.do_animation(element, animation_name, params);
    }

    if (params.asynchronous = true) {
      return new AsynchronousAction(callback);
    } else {
      return new Action(callback);
    }
  }

  static async do_animation(element, animation_name, params) {
    params = params || {
      "duration": "",
      "delay": "",
      "iterationCount": ""
    };

    var duration = Draw._get_duration_or_delay_string(params.duration);
    var delay = Draw._get_duration_or_delay_string(params.delay);
    var iterationCount = params.iterationCount || "";

    var animation_resolver = null;
    var animation_done = new Promise((r) => { animation_resolver = r; });

     function event_listener() {
       element.removeEventListener('animationend', event_listener);
       Draw.remove_animations(element);
       animation_resolver();
    }
    element.addEventListener('animationend', event_listener);

    if (params.noCancel) {
      element.className = "nocancel";
    } else {
      element.className = "";
    }
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
  static async draw(element, position, img_params, animation, animation_params) {
    async function callback() {
      // remove element if it was previously somewhere else
      element.remove();
      element.style.display = "";

      Draw._set_style(element, position);
      if (img_params)
        Draw._set_style(element, img_params);

      _main_display.appendChild(element);

      if (animation)
        await Draw.do_animation(element, animation, animation_params);
    }
    return new SpriteThunk(element, callback);
  }

  static async remove(element) {
    element.remove();
    element.style.display = "none";
    document.appendChild(element);
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
      if (!el.classList.contains('nocancel')) {
        Draw.cancel_animations(el);
      }
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

export class Delay {
  constructor(delay) {
    if (typeof(delay) != 'number') {
      throw new Error("Expected number!");
    }

    this.delay = delay;
  }

  async wait() {
    await Delay.sleep(this.delay);
  }

  static async sleep(duration) {
    var resolver = null;
    var sleep_done = new Promise((r) => { resolver = r; });
    setTimeout(resolver, duration);

    await sleep_done;
  }
}

// should allow a sequence of text with delays
export class Sequence {
  constructor() {
    // check arguments types
    this.values = [];
    for (var argument of arguments)
      this.values.push(argument);

    this.done = false;
  }

  async get() {
    while (true) {
      if (!this.values.length)
        return null;

      var val = this.values.shift();
      if (this.values.length == 0)
        this.done = true;

      if (val instanceof Delay) {
        await val.wait();
      } else {
        return val;
      }
    }
  }
}
