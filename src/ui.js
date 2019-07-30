// TODO have multiple 'displays' that can be switched between
import Typed from './typed/typed.js';

import * as Actions from './actions.js';
import {set_style, eventFire} from './utils.js';
import {
  Action,
  AsynchronousAction,
  Choice,
  ChoiceResult,
  Delay,
  ExecAction,
  Jump,
  Menu,
  Sequence,
} from './actions.js';
import {History, HistoryItem} from './game.js';
import {config, keymanager} from './config.js';

export class UI {
  constructor() {
    this.parent = null;

    this.main_display = null;
    this.main_display_img = null;

    // a secondary div to throw temporary menus and stuff onto
    this.secondary_display = null;

    this.pause_menu = null;
    this.pause_button = null;

    this.textbox = null;

    this.state = {
      hijacker: null,
      waiting_for_clicks: null,
    };

    this.scene_map = new Map();
  }

  _setup_parent(parent) {
    this.parent = document.createElement('div');
    this.parent.classList.add("rpgn-parent");
    parent.appendChild(this.parent);
  }

  _setup_main_display() {
    this.main_display = document.createElement('div');
    this.main_display.classList.add("rpgn-main_display");
    this.main_display.onclick = this.toggle_textbox.bind(this);
    this.parent.appendChild(this.main_display);
  }

  _setup_secondary_display() {
    this.secondary_display = document.createElement('div');
    this.secondary_display.classList.add("rpgn-secondary_display");
  }

  _setup_textbox() {
    var that = this;
    this.textbox_parent = document.createElement('div');
    this.textbox_parent.classList.add("rpgn-textbox-parent");

    this.textbox = document.createElement('div');
    this.textbox.classList.add("nes-container", "is-rounded", "rpgn-textbox");
    this.textbox_parent.appendChild(this.textbox);

    function register_click_event(e) {
      if (that.state.hijacker) {
        that.state.hijacker(e);
        that.state.hijacker = null;
      } else if (that.state.waiting_for_clicks) {
        that.state.waiting_for_clicks();
        that.state.waiting_for_clicks = null;
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
    this.textbox.onclick = register_click_event;
    this.parent.appendChild(this.textbox_parent);
  }

  _setup_pause(game) {
    var that = this;
    this.pause_menu = document.createElement("div");
    this.pause_menu.classList.add("pause");
    this.pause_menu.onclick = function(e) {
      if (e.target == that.pause_menu) {
        that.remove_pause();
      }
    }
    game.setup_pause_menu(this.pause_menu);
    this.pause_menu.style.display = "none";
    this.parent.appendChild(this.pause_menu);

    this.pause_button = document.createElement("button");
    this.pause_button.innerHTML = "(p)ause";
    this.pause_button.onclick = function() { that.summon_pause(game); };
    this.pause_button.classList.add("pause-button", "nes-btn");
    this.parent.appendChild(this.pause_button);

  }

  _setup_keybindings(game) {
    var that = this;
    // TODO make a wrapper around Mousetrap to allow things like
    // having a "stack" of functions that can be used for 'context aware' actions

    keymanager.register('p', function() {
      if (that.pause_menu.style.display == "none")
        that.summon_pause(game);
      else
        that.remove_pause();
    });

    keymanager.register('t', function() {
      that.toggle_textbox();
    });

    // Mousetrap.bind('s', function() {
    //   game.save();
    // });

    keymanager.register('space', function() {
      eventFire(that.textbox, 'click');
    });
  }

  initialize(parent, game, scene_list) {
    this._setup_parent(parent);
    this._setup_main_display();
    this._setup_secondary_display();
    this._setup_textbox();
    this._setup_pause(game);

    this._setup_keybindings(game);

    for (var scene of scene_list) {
      if (this.scene_map.get(scene.name)) {
        throw new Error("Scene name '" + scene.name + "' is already taken! Please use unique names!");
      }
      this.scene_map.set(scene.name, scene);
    }
  }

  get_scene_from_name(name) {
    return this.scene_map.get(name);
  }

  activate_secondary_display() {
    // clear display
    this.secondary_display.innerHTML = "";
    // render display
    this.parent.appendChild(this.secondary_display);
    return this.secondary_display;
  }

  deactivate_secondary_display() {
    this.secondary_display.remove();
  }

  hide_textbox() {
    this.textbox.style.display = "none";
  }

  show_textbox() {
    this.textbox.style.display = "";
  }

  toggle_textbox() {
    if (this.textbox.style.display == "")
      this.textbox.style.display = "none";
    else if (this.textbox.style.display == "none")
      this.textbox.style.display = "";
  }

  remove_pause() {
    while(this.pause_menu.paused_music.length)
      this.playAudio(this.pause_menu.paused_music.pop(), {noReset: true, asynchronous: true}).run();
    this.pause_menu.style.display = "none";
    this.pause_button.style.display = "";
    keymanager.pop_layer();
  }

  async summon_pause(game) {
    keymanager.push_layer();

    keymanager.register('esc', this.remove_pause.bind(this));

    this.pause_menu.style.display = "";
    this.pause_menu.paused_music = await pause_all_audio();
    this.pause_button.style.display = "none";
    game.pause_handler(this.pause_menu);
  }

  // Actions:
  draw(element, position, img_params, animation, animation_params) {
    return Draw.draw(this.main_display, element, position, img_params, animation, animation_params);
  }

  clearScene(duration) {
    var that = this;
    return new Action(async function() {
      var waiters = [];
      var elements = (function() {
        var nodes = [];
        for (var n of that.main_display.childNodes)
          nodes.push(n);
        return nodes;
      })();

      for (var element of elements) {
        if (duration) {
          waiters.push(Draw.do_animation(element, "fadeOut", {
            duration: duration,
            noCancel: true,
          }));
        }
      }
      waiters.push(pause_all_audio());

      for (var waiter of waiters)
        await waiter;

      for (var element of elements) {
        element.remove();
        element.style.display = "none";
      }

      if (that.main_display_img) {
        that.main_display_img.remove();
        that.main_display_img = null;
      }

      that.reset_textbox();
    });
  }

  reset_textbox() {
    this.textbox.innerHTML = "";
  }

  async wait_for_click() {
    var that = this;
    var p = new Promise((r) => {
      that.state.waiting_for_clicks = r;
    });
    await p;
  }

  setBackground(element, duration) {
    var that = this;
    return new Action(async function() {
      element.remove();
      apply_background_style(element);
      that.main_display.insertBefore(element, that.main_display.childNodes[0]);
      that.main_display_img = element;

      await Draw.do_animation(that.main_display_img, "fadeIn", {"duration": duration});
    });
  }

  /** params:
   *  loop
   *  noReset
   *  fadeIn
   *  volume
   *
   * TODO add params to control fadeIn step/time
   */
  // TODO implement pauseAudio
  playAudio(audio, params) {
    params = params || {};
    params.volume = params.volume || 1;

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

      if (params.fadeIn) {
        audio.volume = 0;
        transitionVolume(audio, params.volume);
      } else {
        audio.volume = params.volume;
      }

      audio.play();

      return audio_done;
    }

    if (params.asynchronous) {
      return new AsynchronousAction(callback);
    } else {
      return new Action(callback);
    }
  }

  exec (callback) {
    return new ExecAction(callback);
  }

  jump(next) {
    return new Jump(next);
  }

  sequence() {
    return new Sequence(arguments);
  }

  menu() {
    var options = arguments;
    return new Menu(options, this);
  }

  choice() {
    var choices = arguments;
    return new Choice(choices, this);
  }

  delay(val) {
    return new Delay(val);
  }
}

export var ui = new UI();

function apply_background_style(element) {
  element.style.width = "100%";
  element.style.height = "100%";
  element.style.display = "";
}

// TODO allow fading out audio
// TODO allow a fixed number of iterations of audio
export async function transitionVolume(audio, targetVolume, params) {
  params = params || {};
  var freq = params.freq || 100;
  var step = params.step || 0.1;

  var resolver = null;
  var volume_changed = new Promise((r) => { resolver = r; });
  (function changeVolume() {
    if (Math.abs(targetVolume - audio.volume) <= step) {
      audio.volume = targetVolume;
      resolver();
      return;
    }
    if (audio.volume < targetVolume) {
      audio.volume += step;
    } else if (audio.volume > targetVolume) {
      audio.volume -= step;
    }

    if (audio.volume != targetVolume)
      setTimeout(changeVolume, freq);
  })();

  await volume_changed;
}

async function pause_all_audio() {
  var paused_audio = [];
  for (var a of document.querySelectorAll('audio')) {
    if (!a.paused) {
      await transitionVolume(a, 0);
      a.pause();
      paused_audio.push(a);
    }
  }
  return paused_audio;
}

const valid_scene_symbols = new Set([
  Actions.NO_ACTION,
  Actions.UNREACHABLE,
  Actions.WAIT_FOR_CLICK,
  Actions.HIDE_TEXTBOX,
  Actions.SHOW_TEXTBOX,
  Actions.CLEAR_TEXTBOX,
])

export class Scene {
  constructor(params) {
    this.name = params.name;
    this.cleanup = Boolean(params.cleanup);
    this.contents = params.contents;
    this.hide_textbox = Boolean(params.hide_textbox);
  }

  async handle_text(text) {
      ui.reset_textbox();
      await this.append_text(text);
      await ui.wait_for_click();
  }

  async append_text(text) {
    var resolver = null;
    var typing_done = new Promise((r) => { resolver = r; });
    var p = document.createElement('p');
    ui.textbox.appendChild(p);
    var typed = new Typed(p, {
      strings: [text],
      showCursor: false,
      typeSpeed: config.typespeed, // TODO make this customizable
      onComplete: resolver,
      onDestroy: resolver,
    });

    function kill_typer() {
      typed.destroy();
      p.innerHTML = text;
    }
    ui.state.hijacker = kill_typer;

    await typing_done;
    ui.state.hijacker = null;
  }

  async handle_action(game, action, idx) {
    var res = null;
    if (action instanceof AsynchronousAction)
      res = {"promise": action.run()};
    else
      res = await action.run();

    if (action instanceof Menu) {
      game.menu_selections.push(res);
    } else if (action instanceof Choice || action instanceof Jump) {
      var scene_name = null;

      if (res == null) {
        return null;
      } else if (action instanceof Jump) {
        scene_name = res;
      } else if (action instanceof Choice && res instanceof ChoiceResult) {
        game.history.push(HistoryItem.choice(this.name, idx, res.id));
        if (res.scene_name == Actions.NO_ACTION)
          return null;
        scene_name = res.scene_name;
      } else {
        throw new Error("Expected an instance of ui.Jump or ui.ChoiceResult");
      }

      // TODO consider refactoring this to append res to an array so that we
      // function.
      var next_scene = ui.scene_map.get(scene_name);
      if (!next_scene) {
        throw new Error("Could not find scene '" + scene_name + "'");
      }

      await next_scene.run(game);
      return Actions.EXECUTED_SCENE;
    }

    return res;
  }

  async handle_sequence(game, idx, sequence) {
    ui.reset_textbox();
    while (!sequence.done) {
      var val = await sequence.get();
      if (typeof(val) == 'string') {
        await this.append_text(val);
        await ui.wait_for_click(); //  TODO text that doesn't need a click
      } else {
        var res = await this.handle_all(game, val, idx);
        if (res == Actions.EXECUTED_SCENE)
          return Actions.EXECUTED_SCENE;
      }
    }
  }

  async handle_symbol(symbol) {
    if (!valid_scene_symbols.has(symbol)) {
      throw new Error("Symbol '" + symbol.description + "' is not permitted in this context");
    }

    if (symbol == Actions.NO_ACTION)
      return
    else if (symbol == Actions.UNREACHABLE)
      throw new Error("Reached game point tagged as UNREACHABLE");
    else if (symbol == Actions.WAIT_FOR_CLICK)
      return await ui.wait_for_click();
    else if (symbol == Actions.HIDE_TEXTBOX)
      ui.hide_textbox();
    else if (symbol == Actions.SHOW_TEXTBOX)
      ui.show_textbox();
    else if (symbol == Actions.CLEAR_TEXTBOX)
      ui.reset_textbox();
  }

  async handle_all(game, action, idx) {
    if (typeof(action) == 'symbol') {
      return this.handle_symbol(action);
    } else if (action instanceof Delay) {
      return await action.wait();
    } else if (action instanceof ExecAction) {
      return this.handle_all(game, action.run(game), idx);
    } else if (action instanceof Action) {
      return await this.handle_action(game, action, idx);
    } else if (typeof(action) == 'string') {
      return await this.handle_text(action);
    } else if (action instanceof Sequence) {
      return await this.handle_sequence(game, idx, action);
    } else {
      console.log("Unexpected argument", action);
      throw new Error("Unexpected argument");
    }
  }

  async _scene(game, actions, idx) {
    idx = Number(idx) || 0;
    for (; idx < actions.length; idx++) {
      var action = actions[idx];
      game.history.push(HistoryItem.scene_progress(this.name, idx));

      var res = await this.handle_all(game, action);
      if (res == Actions.EXECUTED_SCENE)
        break;
    }
  }

  async run(game, idx) {
    game.save();

    if (this.cleanup) {
      await ui.clearScene().run();
    }

    if (this.hide_textbox) {
      ui.hide_textbox();
    } else {
      ui.show_textbox();
    }

    var contents = await this.contents(game);
    // TODO validate that contents is array of Actions or strings
    return this._scene(game, contents, idx);
  }
}

export class Draw {
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
    params = params || {};

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

  // TODO animate from point a to point b

  /**
   * img_params, animation, animation_params are optional
   */
  static draw(parent_el, element, position, img_params, animation, animation_params) {
    async function callback() {
      // remove element if it was previously somewhere else
      element.remove();
      element.style.display = "";

      set_style(element, position);
      if (img_params)
        set_style(element, img_params);

      parent_el.appendChild(element);

      if (animation)
        await Draw.do_animation(element, animation, animation_params);
    }
    return new Action(callback);
  }

  static _remove(element) {
    element.remove();
    element.style.display = "none";
    document.body.appendChild(element);
  }

  static remove(element, animation, animation_params) {
    animation_params = animation_params || {};
    var type = animation_params.asynchronous ? AsynchronousAction : Action;
    console.log("TYPE", type);
    return new type(async () => {
      if (animation) {
        await Draw.animate(element, animation, animation_params).run();
      }

      console.log("Removing", element);

      Draw._remove(element);
    });
  }
}
