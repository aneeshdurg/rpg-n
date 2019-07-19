import * as Combat from '../src/combat.js';
import * as Items from '../src/items.js';

export var Types = new Combat.MoveTypes({
  'fighting': {},
});

export class FinalSmash extends Combat.Move {
  use_move(victim) {
    for (var idx in this.user.moves) {
      if (this.user.moves[idx] instanceof FinalSmash) {
        delete this.user.moves[idx];
        break;
      }
    }

    return new Combat.MoveResult(
        new Combat.Damage(['fighting'], 0),
        new Combat.Damage(['fighting'], victim.hp * 2),
        ["Final smash!"]
    );
  }
}

export class Punch extends Combat.Move {
  use_move(victim) {
    return new Combat.MoveResult(
        new Combat.Damage(['fighting'], 0),
        new Combat.Damage(['fighting'], this.user.level * 10 + (Math.floor(Math.random() * 10))),
        ["Punch!"]
    );
  }
}

export class Kick extends Combat.Move {
  use_move(victim) {
    return new Combat.MoveResult(
        new Combat.Damage(['fighting'], this.user.level * 2),
        new Combat.Damage(['fighting'], this.user.level * 12),
        ["Kick!"]
    );
  }
}

export class SSBFighter extends Combat.Character {
  constructor(name, color, types, type_info) {
    super(name, color, types, type_info);
    this.moves = [new Punch(this, ['fighting'], null), new Kick(this, ['fighting'], null)];
  }
}

export class SSBOrb extends Items.ItemDescriptor {
  use(game) {
    var final_smash = new FinalSmash(this.owner, ['fighting'], null);
    this.owner.moves.push(final_smash);
    return null;
  }
}

export var shared_backpack = new Items.Backpack();

export class SSBFighterInteractive extends Combat.InteractiveCharacter {
  constructor(name, color, types, type_info) {
    super(name, color, types, type_info);
    this.moves = [new Punch(this, ['fighting'], null), new Kick(this, ['fighting'], null)];
  }

  static from_obj(obj) {
    var character = super.from_obj(obj);
    character.backpack = shared_backpack;
    return character;
  }
}
