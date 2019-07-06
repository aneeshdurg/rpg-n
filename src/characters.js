import { ExFunc } from "./exfunc.js";

export class Character extends ExFunc {
  constructor() {
    this.abilities = new Abilities();
    this.backpack = new items.Backpack();
  }
}

// A character capable of fighting
export class CombatCharacter extends Character {}

// The main character
export class Player extends CombatCharacter {
  constructor() {
    super();
    this.party = new Party();
  }

  save(key) {
    // generate save state and write to localstorage under key
    return "";
  }
}

// A collection of Characters that are in the Player's part
export class Party extends Array {}

// This export class represents the dialogue of a character
export class Dialogue {}

// Abilities a character can have.
export class Abilities extends Map {}
