import * as items from './items.js';
import {Assets} from './assets.js';
import * as Text from './text.js';

export class Dialogue {
  render(text) {
    // returns an HTML string describing how the text should be formatted
    return text;
  }

  get renderer() {
    return this.render.bind(this);
  }
}

export class Character {
  constructor(name, color) {
    this.name = name;
    this.color = color;

    this.renderer = null;
    this.construct_dialogue();

    this.assets = new Assets();
  }

  construct_dialogue() {
    var that = this;
    class CharacterDialogue extends Dialogue {
      render(text) {
        return Text.with_color(that.color, that.name) + ": " + text;
      }
    }
    this.renderer = (new CharacterDialogue()).renderer;
  }

  static from_obj(obj, loading_container) {
    var args = [null];
    for (var param of obj.constructor_args) {
      args.push(param);
    }

    var character = new (Function.prototype.bind.apply(this, args));

    character.assets = new Assets();
    if (obj.assets) {
      if (obj.assets.audio)
        character.assets.loadAudio(obj.assets.audio);
      if (obj.assets.images)
        character.assets.loadImages(obj.assets.images);
    }

    return character;
  }

  async wait_for_load(parent_el) {
    if (arguments.length)
      await this.assets.wait_for_load(parent_el);
    else
      await this.assets.wait_for_load();
  }

  get_image(key) {
    return this.assets.images.get(key);
  }

  get sprite() {
    if (this.assets.images.has('sprite')) {
      return this.assets.images.get('sprite');
    } else {
      var entries = this.assets.images.entries();
      var entry = entries.next();
      if (entry.done == true)
        return null;
      return entry.value[1];
    }
  }
}

// The main character
export class Player extends Character {
  constructor(name, color) {
    super(name, color);
    this.party = new Party();
    this.wallet = new items.Wallet(0);
  }

  to_string() {
    // TODO create a "item table" on the backpack to allow reconstructing
    // serialized items given their constructor name
  }

  static from_string() {
  }
}

// A collection of Characters that are in the Player's part
export class Party extends Array {}
