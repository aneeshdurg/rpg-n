import * as ui from './ui.js';
import * as characters from './characters.js';

/**
 * move_heirarchy = {
 *   rock: {
 *     advantage: ['scissors', ['ether': 2]], +1 resistance to scissors +2 resistance to ether
 *     disadvantage: ['paper', ['ether': 1]], -1 resistance to paper -1 resistance to ether
 *   },
 *   scissors: {
 *     advantage: ['paper', ['ether': 1]],
 *     disadvantage: ['rock', ['ether': 2]],
 *   },
 *   paper: {
 *     advantage: ['rock', ['ether': 2]],
 *     disadvantage: ['scissors', ['ether': 2]],
 *   },
 *   ether: {
 *     advantage: ['rock', 'scissors', 'paper'],
 *     disadvantage: ['ether': 3],
 *   },
 * }
 */
export class MoveType {
  constructor(heirarchy) {}
}

export class Move {
  constructor(type, ) {
    this.type = type; // MoveType
  }

  calculate_power() {
    // return tuple:
    //  damage to opponent,
    //  damage to self
  }

  on_critical(/* takes the output of calculate power */) {
  }
}

export class StatusEffect {
  constructor(character) {
  }

  pause() {}
  // this.rolling_interval;
  rolling_effect() {} // run effect if this.rolling_interval > 0 every this.rolling_interval ms
  trigger() {} // run effect once during battle
}

export class Scene extends ui.Scene {}

// A character capable of fighting
export class Character extends characters.Character {
  constructor(name, color) {
    super(name, color);

    this.level = 0;
    this.hp = 0;
    this.max_hp = 0;
    this.type = new MoveType();
    this.moves = [];
  }

  get opposing_sprite() {}
  get protag_sprite() {}
  get moves_list() {}
  add_move(move) {}
  forget_move(move) {}

  damage(amt) {
    // what do when hp < 0?
    this.hp -= amt;
  }

  heal(amt) {
    // what do when hp > max_hp?
    this.hp += amt;
  }
}
