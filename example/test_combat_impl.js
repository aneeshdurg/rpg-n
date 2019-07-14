import * as Combat from '../src/combat.js';
import * as Items from '../src/items.js';
import * as ui from '../src/ui.js';
import {assets} from '../src/assets.js';

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

  get_sprite_position(victim) {
    var victim_style = window.getComputedStyle(victim.active_sprite);
    function to_num(prop) {
      return Number(prop.replace('px', ''));
    }

    var position = {
      'position': 'absolute',
      'margin': "",
    };

    position["bottom"] =
      to_num(victim_style["bottom"]) + to_num(victim_style["marginBottom"]) + to_num(victim_style.height) / 2 - this.sprite.height / 2;
    position["top"] =
      to_num(victim_style["top"]) + to_num(victim_style["marginTop"]) + to_num(victim_style.height) / 2 - this.sprite.height / 2;
    position["left"] =
      to_num(victim_style["left"]) + to_num(victim_style["marginLeft"]) + to_num(victim_style.width) / 2 - this.sprite.width / 2;
    position["right"] =
      to_num(victim_style["right"]) + to_num(victim_style["marginRight"]) + to_num(victim_style.width) / 2 - this.sprite.width / 2;

    return position;
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

  async use_move(victim) {
    this.sprite = assets.images.get('fist');
    this.sfx = assets.audio.get('punch');

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

    if (victim.active_sprite) {
      var position = this.get_sprite_position(victim);

      await ui.Draw.draw(this.sprite, position).run();
      ui.playAudio(this.sfx, {asynchronous: true}).run();
      await ui.delay(250).run();
      await ui.Draw.animate(this.sprite, 'zoomOut').run();
      await ui.Draw.remove(this.sprite);

    } else {
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

  async use_move(victim) {
    this.sprite = assets.images.get('fire');
    this.sfx = assets.audio.get('fireball');

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

    if (victim.active_sprite) {
      var position = this.get_sprite_position(victim);

      await ui.Draw.draw(this.sprite, position).run();
      ui.playAudio(this.sfx, {asynchronous: true}).run();
      await ui.delay(250).run();
      await ui.Draw.animate(this.sprite, 'zoomOut').run();
      await ui.Draw.remove(this.sprite);

    } else {
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
  level *= (max_level - 1);
  dragon.level = Math.round(level) + 1;
  dragon.moves.push(new Fireball(dragon));
  dragon.moves.push(new Punch(dragon));

  return dragon;
}
