import * as items from './items.js';

export class Game {
  constructor() {
    this.player = new Player();
  }
}

class Player {
  constructor() {
    this.inventory = [true];
  }

  save(key) {
    // generate save state and write to localstorage under key
    return "";
  }
}
