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

    this.backpack = new items.Backpack();

    this.renderer = null;
    this.construct_dialogue();

    this.assets = new Assets();

    // resolved promise
    this.loaded = new Promise(r => { r(); });
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
    var character = new Character(obj.name, obj.color);

    character.assets = new Assets();
    if (obj.assets) {
      if (obj.assets.audio)
        character.assets.loadAudio(obj.assets.audio);
      if (obj.assets.images)
        character.assets.loadImages(obj.assets.images);
    }

    character.loaded = character.assets.wait_for_load(loading_container);
    return character;
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
  }

}

// A collection of Characters that are in the Player's part
export class Party extends Array {}
