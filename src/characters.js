import * as items from './items.js';

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

    this.assets = {};
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

  set_asset(name, img_src) {
    this.assets[name] = img_src;
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
