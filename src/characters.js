import * as items from './items.js';
import {Assets} from './assets.js';

// This class contains methods to help a scene format text
export class Text {}

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

    this.abilities = new Abilities();
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
        return "<span style=\"color:" + that.color + "\">" + that.name + "</span>: " + text;
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
    console.log(key, this.assets.images);
    return this.assets.images.get(key);
  }
}

// A character capable of fighting
export class CombatCharacter extends Character {}

// The main character
export class Player extends CombatCharacter {
  constructor(name, color) {
    super(name, color);
    this.party = new Party();
  }

}

// A collection of Characters that are in the Player's part
export class Party extends Array {}

// Abilities a character can have.
export class Abilities extends Map {}
