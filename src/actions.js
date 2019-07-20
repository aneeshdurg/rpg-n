/**
    _        _   _
   / \   ___| |_(_) ___  _ __  ___
  / _ \ / __| __| |/ _ \| '_ \/ __|
 / ___ \ (__| |_| | (_) | | | \__ \
/_/   \_\___|\__|_|\___/|_| |_|___/
figlet: Actions

This module defines "actions" that a game might use
*/

import {set_style} from './utils.js';

/**
 * These symbols are actions that must be implemented by the game engine
 */
export const EXECUTED_SCENE = Symbol('EXECUTED_SCENE');
export const NO_ACTION = Symbol('NO_ACTION');
export const UNREACHABLE = Symbol('UNREACHABLE');
export const WAIT_FOR_CLICK = Symbol('WAIT_FOR_CLICK');
export const HIDE_TEXTBOX = Symbol('HIDE_TEXTBOX');
export const SHOW_TEXTBOX = Symbol('SHOW_TEXTBOX');
export const CLEAR_TEXTBOX = Symbol('CLEAR_TEXTBOX');

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

// No different from a normal action but is just a tag that this action prefers not to be waited on
export class AsynchronousAction extends Action {}

// An action that requires game state to run
export class ExecAction extends Action{
  run(game) {
    return this.callback(game);
  }
}

// Indicates a jump to another scene
export class Jump extends Action {
  constructor(name) {
    super(() => name);
  }
}

// Present a menu to the user and wait for a selection to be made
export class Menu extends Action {
  constructor(options, ui) {
    super(async function() {
      var resolver = null;
      var option_chosen = new Promise((r) => { resolver = r; });
      var chosen_option = null;
      ui.textbox.innerHTML = "";
      for (var option of options) {
        // option[0] == choice text
        // option[1] == optional style for button
        // TODO use mousetrap for keyboard support
        var b = document.createElement('button');
        b.className = "menuButton";
        if (option.length >= 2) {
          set_style(b, option[1]);
        }

        b.innerHTML = option[0];
        function _gen_callback(option_text) {
          return function () {
            resolver();
            chosen_option = option_text;
          };
        }
        b.onclick = _gen_callback(option[0]);

        ui.textbox.appendChild(b);
        ui.textbox.appendChild(document.createElement('br'));
      }

      await option_chosen;
      return chosen_option;
    });
  }
}

export class ChoiceResult {
  constructor(scene_name, id) {
    this.scene_name = scene_name;
    this.id = id;
  }
}

// A choice that a user needs to make. Similar to menu but more
// structured/restrictive
export class Choice extends Action {
  constructor(choices, ui) {
    super(async function() {
      var resolver = null;
      var choice_chosen = new Promise((r) => { resolver = r; });
      var chosen_action = null;
      var chosen_idx = -1;
      for (var idx in choices) {
        var choice = choices[idx]
        // choice[0] == choice text
        // choice[1] == choice action or NO_ACTION
        // choice[2] == optional style for button
        // TODO use mousetrap for keyboard support
        var b = document.createElement('button');
        b.className = "choiceButton";
        if (choice.length >= 3) {
          set_style(b, choice[2]);
        }

        b.innerHTML = choice[0];
        function _gen_callback(callback, idx) {
          return function () {
            resolver();
            chosen_action = callback;
            chosen_idx = idx;
          };
        }
        b.onclick = _gen_callback(choice[1], idx);

        ui.textbox.appendChild(b);
        ui.textbox.appendChild(document.createElement('br'));
      }

      await choice_chosen;
      return new ChoiceResult(chosen_action, chosen_idx);
    });
  }
}

// An action that 'sleeps'
export class Delay extends Action {
  constructor(delay) {
    super(() => {});
    if (typeof(delay) != 'number') {
      throw new Error("Expected number!");
    }

    this.delay = delay;
  }

  async run() {
    await this.wait();
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

// A class that holds a sequence of actions to be executed
export class Sequence {
  constructor(args) {
    // check arguments types
    this.values = [];
    for (var argument of args)
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
