import * as Combat from '/src/combat.js';
import * as Items from '/src/items.js';

export var Types = new Combat.MoveTypes({
  'fighting': {
    advantage: ['magic'],
  },
  'magic': {
    advantage: ['fighting'],
    disadvantage: [['magic', 2]],
  }
});

export class ExampleMove extends Combat.Move {
  constructor(user, types) {
    super(user, types, null);
    this.fight_level = this.types.has('fighting') ? 1 : 0;
    this.magic_level = this.types.has('magic') ? 1 : 0;
  }

  level_up() {
    this.fight_level++;
  }

  mlevel_up() {
    this.magic_level++;
  }

  use_move(victim) {
    if (this.types.has('magic')) {
      // could drain this.user's MP
    }
  }

}

export class Bleed extends Combat.StatusEffect {
  constructor(origin, level) {
    super(origin);
    this.level = level;
    this.counter = 0;
  }

  on_turn(character) {
    this.counter++;

    // bleeds for three turns
    if (this.counter < 3) {
      return new Combat.MoveResult(
        new Combat.Damage(['fighting'], 0),
        new Combat.Damage(['fighting'], this.level * 3),
        ["Bleeding did " + this.level * 3 + " damage"]
      );
    }
  }
}

export class Burn extends Combat.StatusEffect {
  constructor(origin, level) {
    super(origin);
    this.level = level;
    this.counter = 0;
  }

  on_turn(character) {
    this.counter++;
    if (this.counter < 5) {
      return new Combat.MoveResult(
        new Combat.Damage(['magic'], 0),
        new Combat.Damage(['magic'], this.level * 3),
        ["Burning did " + this.level * 3 + " damage"],
      );
    }
  }
}

export class Punch extends ExampleMove {
  constructor(user) {
    super(user, ['fighting'], null);
    this.fight_level = 1;
    this.magic_level = 0;
    this.critical_chance = 0.7;
    this.bleed_chance = 0.9;
  }

  use_move() {
    var damage = this.user.level * (this.fight_level * 15 + this.magic_level);
    var description = [];
    var statuseffect = null;

    if (Math.random() < this.critical_chance) {
      damage += this.user.level * (this.fight_level * 10);
      description.push("Critical hit!");
    }
    description.push("Punch did " + damage + " damage!");

    if (Math.random() < this.bleed_chance) {
      statuseffect = new Bleed(this.user, 2 * this.user.level * this.fight_level);
      description.push("Punch caused bleeding!");
    }
    return new Combat.MoveResult(
      new Combat.Damage(this.types, 0),
      new Combat.Damage(this.types, damage, statuseffect),
      description,
    );
  }
}

export class Fireball extends ExampleMove {
  constructor(user) {
    super(user, ['magic'], null);
    this.fight_level = 0;
    this.magic_level = 1;
    this.critical_chance = 0.5;
    this.burn_chance = 0.5;
  }

  use_move() {
    var damage = this.user.level * (this.magic_level * 20 + this.fight_level);
    var description = [];
    var statuseffect = null;
    if (Math.random() < this.critical_chance) {
      damage += this.user.level * this.magic_level * 5;
      description.push("Critical hit!");
    }
    description.push("Fireball did " + damage + " damage!");

    if (Math.random() < this.burn_chance) {
      statuseffect = new Burn(this.user, this.user.level * this.magic_level);
      description.push("Fireball caused burning!");
    }

    return new Combat.MoveResult(
      new Combat.Damage(this.types, 0),
      new Combat.Damage(this.types, damage, statuseffect),
      description,
    );
  }
}

//var container = document.createElement("div");
//
//var stats = document.createElement("pre");
//container.appendChild(stats);
//
//var text = document.createElement("pre");
//container.appendChild(text);
//
//document.body.appendChild(container);

export class Knight extends Combat.InteractiveCharacter {
  constructor() {
    super("knight", "green", ["fighting"], Types);
    this.moves.push(new Punch(this));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.level = 2;
  }

  get exp() {
    return this._exp;
  }

  set exp(amt) {
    this._exp = amt;
    console.log(amt, Math.log10(amt), Math.floor(Math.log10(amt)));
    this.level = Math.floor(Math.log10(amt)) + 2;
  }
}

export async function get_dragon(max_level) {
  var dragon = new Combat.Character("dragon", "blue", ["magic"], Types);
  dragon.assets.loadImages({
      base_path: './assets/combat_demo/',
      heroSprite: 'dragon.png',
      enemySprite: 'dragon.png',
  });
  await dragon.loaded;

  var level = Math.random();
  console.log("lvl", level);
  level *= (max_level - 1);
  console.log("   ", level);
  dragon.level = Math.round(level) + 1;
  dragon.moves.push(new Fireball(dragon));
  dragon.moves.push(new Punch(dragon));

  return dragon;
}
