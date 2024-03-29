import * as items from './items.js';
import * as characters from './characters.js';
import {ui} from './ui.js';

const LOAD_FROM_STORAGE = "__game_load";

export class Game {
  constructor(player) {
    if (!(player instanceof characters.Player))
      throw new Error("player is not an instance of Player()");

    this.player = player; // TODO add this to the save
    this.flags = new Flags(); // TODO add this to the save
    this.default_save_key = "";
    this.history = new History();
    this.menu_selections = []; // TODO add this to the save
  }

  initialize(parent_el, scenes) {
    ui.initialize(parent_el, this, scenes);
    var load_key = localStorage.getItem(LOAD_FROM_STORAGE);
    if (typeof(load_key) == 'string') {
      console.log("Loading with '" + load_key + "'");
      this._load(load_key);
      localStorage.removeItem(LOAD_FROM_STORAGE);
      var last_item = this.history.slice(-1)[0];
      this.entrypoint = ui.get_scene_from_name(last_item.scene_name);
      // TODO when loading scene load sprites and stuff also when jumping to
      // some idx
      //
      // also prevent scenes from having cleanup: false?
      // this.entrypoint_idx = last_item.idx;
      this.entrypoint_idx = 0;
    } else {
      this.entrypoint = scenes[0];
      this.entrypoint_idx = 0;
    }
  }

  async run() {
    // TODO load a splashscreen before run to get user interaction to enable
    // autoplay
    if (!this.entrypoint) {
      throw new Error("Game not initialized!");
    }

    await this.entrypoint.run(this, this.entrypoint_idx);
  }

  static get_load_keys(key) {
     var base = "load" + (key ? "." + key : "");
    return {
      base: base,
      history: base + ":history",
      player: base + ":player",
      flags: base + ":flags",
      menu_selections: base + ":menu_selections",
    };
  }

  setup_pause_menu(parent) {
    var that = this;

    this._container = document.createElement("div");

    this._container.className = "pause-container";
    //this._container.onclick = function(e) {
    //  if (e.target == that._container) {
    //    ui.remove_pause();
    //  }
    //}

    this._save_input = document.createElement("input");
    this._save_input.classList.add("nes-input");
    this._save_input.placeholder = "Enter save key (default: '')";

    this._save_button = document.createElement("button");
    this._save_button.classList.add("nes-btn");
    this._save_button.innerHTML = "save";
    this._save_button.onclick = function() {
      that.save(that._save_input.value);
    }

    this._load_button = document.createElement("button");
    this._load_button.classList.add("nes-btn");
    this._load_button.innerHTML = "load";
    this._load_button.onclick = function() {
      try {
        that.load(that._save_input.value);
      } catch(e) {
        alert("Invalid save data!");
      }
    }

    this._container.appendChild(this._save_input);
    this._container.appendChild(document.createElement("br"));
    this._container.appendChild(this._save_button);
    this._container.appendChild(this._load_button);

    parent.appendChild(this._container);
  }

  pause_handler(parent) { }

  _load(key) {
    key = Game.get_load_keys(key);
    var history = localStorage.getItem(key.history);
    if (!history) {
      throw new Error("Expected to find history for key '" + key.history + "'");
    }

    this.history = History.from_string(history);
    while (true) {
      var last = this.history.pop();
      if (last.type == HistoryItem.types.scene_progress) {
        this.history.push(last);
        break;
      }
    }
  }

  load(key) {
    localStorage.setItem(LOAD_FROM_STORAGE, key);
    location.reload(); // TODO make it so that the game can be loaded without reloading the game
  }

  save(key) {
    key = key || this.default_save_key;
    if (key.indexOf(":") >= 0) {
      throw new Error("Cannot have ':' in key");
    }
    key = Game.get_load_keys(key);
    // generate save state and write to localstorage under key
    localStorage.setItem(key.base, "true");
    localStorage.setItem(key.history, this.history.to_string());
    localStorage.setItem(key.player, this.player.to_string()); // TODO implement me!
    localStorage.setItem(key.flags, this.flags.to_string());
    localStorage.setItem(key.menu_selections, JSON.stringify(this.menu_selections));
  }

}

export class History extends Array {
  push(item) {
    if (!(item instanceof HistoryItem)) {
      throw new Error("Expected instance of characters.HistoryItem");
    }

    super.push(item);
  }

  to_string() {
    var result = "";
    for (var h of this) {
      result += h.to_encoded_string();
    }

    return result;
  }

  static from_string(text) {
    var result = new History();
    // format: [a,b,c][d,e,f]...
    while (text.length) {
      // Get the first array from the text
      var fragment = text.slice(0, text.indexOf(']') + 1);
      var item = HistoryItem.from_encoded_string(fragment);
      result.push(item);

      // Continue processing on the rest of the string
      text = text.slice(text.indexOf(']') + 1);
    }

    return result;
  }
}

const _history_item_types = {
  _invalid: Symbol('_invalid'),
  scene_progress: Symbol('scene_progress'),
  choice: Symbol('choice'),
}

export class HistoryItem {
  constructor(scene_name, idx) {
    this.scene_name = scene_name;
    this.idx = idx;
    this.type = HistoryItem.types._invalid;
    this.choice_id = -1;
  }

  static get types() {
    return _history_item_types;
  }

  static scene_progress(scene_name, idx) {
    var h = new HistoryItem(scene_name, idx);
    h.type = HistoryItem.types.scene_progress;
    return h;
  }

  static choice(scene_name, idx, choice_id) {
    var h = new HistoryItem(scene_name, idx);
    h.type = HistoryItem.types.choice;
    h.choice_id = choice_id;
    return h;
  }

  to_encoded_string() {
    var scene_name = encodeURIComponent(this.scene_name);
    var idx = String(this.idx);
    var type = this.type.description;
    var choice_id = String(this.choice_id);
    return "[" + scene_name + "," + idx + "," + type + "," + choice_id + "]";
  }

  static from_encoded_string(text) {
    var components = text.slice(1, -1).split(',');
    if (components.length != 4) {
      throw new Error("Invalid string for HistoryItem");
    }

    var scene_name = decodeURIComponent(components[0]);
    var idx = Number(components[1]);

    var h = new HistoryItem(scene_name, idx);
    h.type = HistoryItem.types[components[2]];
    h.choice_id = String(components[3]);

    return h;
  }
}

class Flags extends Map {
  set(key, value) {
    if (typeof(value) != 'number') {
      throw new Error("Flags must contain numbers!");
    }

    return super.set(key, value);
  }

  get(key, default_val) {
    if (!this.has(key))
      return default_val;
    return super.get(key);
  }

  to_string() {
    var temp = [];
    var entries = this.entries();
    while (true) {
      var entry = entries.next();
      if (entry.done)
        break;
      temp.push(entry.value);
    }
    return JSON.stringify(temp);
  }

  static from_string(string) {
    return new Flags(JSON.parse(string));
  }
}
