import * as items from './items.js';
import * as characters from './Characters.js';

export class Game {
  constructor(player) {
    if (!(player instanceof characters.Player))
      throw new Error("player is not an instance of Player()");

    this.player = player;
  }
}
