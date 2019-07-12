import * as Combat from '/src/combat.js';
import * as Items from '/src/items.js';
import * as ui from '/src/ui.js';
import {Game} from '/src/game.js';
import {Player} from '/src/characters.js';

window.Combat = Combat;

window.Types = new Combat.MoveTypes({
  'fighting': {
    advantage: ['magic'],
  },
  'magic': {
    advantage: ['fighting'],
    disadvantage: [['magic', 2]],
  }
});

class ExampleMove extends Combat.Move {
  constructor(user, types) {
    super(types, null);
    this.user = user;
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

class Bleed extends Combat.StatusEffect {
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

class Burn extends Combat.StatusEffect {
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

class Punch extends ExampleMove {
  constructor(user) {
    super(user, ['fighting'], null);
    this.fight_level = 1;
    this.magic_level = 0;
    this.critical_chance = 0.5;
    this.bleed_chance = 0.9;
  }

  use_move() {
    var damage = this.user.level * (this.fight_level * 10 + this.magic_level);
    var description = [];
    var statuseffect = null;

    if (Math.random() < this.critical_chance) {
      damage += this.user.level * (this.fight_level * 5);
      description.push("Critical hit!");
    }
    description.push("Punch did " + damage + " damage!");

    if (Math.random() < this.bleed_chance) {
      statuseffect = new Bleed(this.user, this.user.level * this.fight_level);
      description.push("Punch caused bleeding!");
    }
    return new Combat.MoveResult(
      new Combat.Damage(this.types, 0),
      new Combat.Damage(this.types, damage, statuseffect),
      description,
    );
  }
}

class Fireball extends ExampleMove {
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

class Knight extends Combat.InteractiveCharacter {
  constructor() {
    super("knight", "green", ["fighting"]);
    this.moves.push(new Punch(this));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.level = 2;
  }
}

function get_dragon(max_level) {
  var dragon = new Combat.Character("dragon", "blue", "magic");
  var level = Math.random();
  console.log("lvl", level);
  level *= (max_level - 1);
  console.log("   ", level);
  dragon.level = Math.round(level) + 1;
  dragon.moves.push(new Fireball(dragon));

  return dragon;
}

var Me = new Player('Me', 'green');
Me.party.push(new Knight());
var me = Me.renderer;

var game = new Game(Me);

var fight_scene = new ui.Scene({
  name: 'battle_knight',
  contents: function(game) {
    console.log(game);
    var knight = game.player.party[0];
    var dragon = get_dragon(knight.level);
    return [
      "Ready to fight?",
      new Combat.RunGame(game, {
        hero: knight,
        enemy: dragon,
        allow_run: {
          run_chance: 0.25,
        },
        on_win: () => { console.log("You won!"); },
        on_lose: () => { console.log("You lost!"); },
      }),
    ]
  },
});

(async function() {
  ui.initialize(document.body, game, [
    fight_scene,
  ]);
  fight_scene.run(game);
})();
