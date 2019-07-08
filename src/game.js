import * as items from './items.js';
import * as characters from './characters.js';

export class Game {
  constructor(player) {
    if (!(player instanceof characters.Player))
      throw new Error("player is not an instance of Player()");

    this.player = player;
    this.default_save_key = "";
    this.history = new History();
  }

  static get_history_key_name(key) {
    return "history" + (key ? "." + key : "");
  }

  load(key) {
    key = Game.get_history_key_name(key);
    var history = localStorage.getItem(key);
    if (!history) {
      throw new Error("Expected to find history for key '" + key + "'");
    }

    this.history = History.from_string(history);
    // TODO reset UI state
    // this requires giving the game control over executing scenes
  }

  save(key) {
    key = key || this.default_save_key;
    key = Game.get_history_key_name(key);
    // generate save state and write to localstorage under key
    localStorage.setItem(key, this.history.to_string());
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
    this.choice_id = -1; // TODO consider storing richer information for choice type (e.g. total choices, all choice strings)
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


