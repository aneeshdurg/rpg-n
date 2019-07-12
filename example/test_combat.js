import * as Combat from '/src/combat.js';
import * as Items from '/src/items.js';

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

var container = document.createElement("div");

var stats = document.createElement("pre");
container.appendChild(stats);

var text = document.createElement("pre");
container.appendChild(text);

document.body.appendChild(container);

class InteractiveActions extends Combat.ActionSelector {
  constructor(hero, enemy, parent) {
    super(hero, enemy);

    this.selected_action = null;

    this.actions = document.createElement("div");
    this.actions.style.display = "none";
    parent.appendChild(this.actions);

    this.punch = document.createElement("button");
    this.punch.innerText = "punch";
    this.actions.appendChild(this.punch);

    this.run = document.createElement("button");
    this.run.innerText = "run";
    this.actions.appendChild(this.run);

    this.items = document.createElement("button");
    this.items.innerText = "items";
    this.actions.appendChild(this.items);

  }

  gen_items_menu(resolver) {
    var that = this;
    return function() {
      var table = document.createElement("table");
      table.id = "itemsTable";

      var potions_row = document.createElement("tr");
      for (var idx in that.hero.backpack.potions) {
        var item = document.createElement("th");
        item.innerHTML = "potion";
        item.addEventListener('click', (function() {
          return function() {
            resolver();
            that.selected_action = knight.backpack.potions.remove(idx);
          }
        })());
        potions_row.appendChild(item);
      }

      table.appendChild(potions_row);
      that.actions.appendChild(table);
    }
  }

  async _get_action() {
    this.selected_action = null;

    this.actions.style.display = "";
    var resolver = null;
    var action_done = new Promise((r) => { resolver = r; });

    var that = this;
    var click_handler = function(e) {
      resolver();
      that.selected_action = e.target.innerText;
    };

    this.punch.addEventListener('click', click_handler);
    this.run.addEventListener('click', click_handler);
    var item_handler = this.gen_items_menu(resolver);
    this.items.addEventListener('click', item_handler);

    await action_done;

    var itemsTable = document.getElementById("itemsTable");
    if (itemsTable)
      itemsTable.remove();

    this.punch.removeEventListener('click', click_handler);
    this.run.removeEventListener('click', click_handler);
    this.items.removeEventListener('click', item_handler);

    this.actions.style.display = "none";
    return this.selected_action;
  }

  async get_action() {
    var action = await this._get_action();
    if (action instanceof Items.ItemDescriptor) {
      var item = action;
      var result = item.use();
      return result;
    } else if (action == "run") {
      return new Combat.Run(); // special run move that needs to be processed differently
    } else {
      var result = knight.moves[0].use_move();
      return result;
    }
  }
}

class Knight extends Combat.Character {
  constructor() {
    super("knight", "green", ["fighting"]);
    this.moves.push(new Punch(this));
    this.backpack.potions.push(new Items.PotionDescriptor(this, 0.5));
    this.level = 2;
  }

  action_selector(enemy) {
    return new InteractiveActions(this, enemy, container);
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

async function sleep(duration) {
  var resolver = null;
  var sleep_done = new Promise((r) => { resolver = r; });
  setTimeout(resolver, duration);
  await sleep_done;
}

function describe_effect(effect) {
  return effect.constructor.name + "(" + effect.level + ")";
}

function display_status_effect(effect, result) {
  if (result) {
    text.innerText += result.description + "\n";
  } else {
    text.innerText += "Effect " + describe_effect(effect) + " ended.\n";
  }
}

window.knight = new Knight();

(async function main() {
  while(true) {
    text.innerText = "Encountered a ferocious dragon!\n";
    var dragon = get_dragon(knight.level + 1);

    var knight_actions = knight.action_selector(dragon);
    var dragon_actions = dragon.action_selector(knight);

    var ran = false;
    var is_knight_turn = true;
    while(dragon.hp && knight.hp && (!ran)) {
      stats.innerText = "knight hp: " + knight.hp + " level: " + knight.level + "\n";
      stats.innerText += "knight status effects: " + knight.status_effects.map(describe_effect) + "\n";
      stats.innerText += "dragon hp: " + dragon.hp + " level: " + dragon.level + "\n";
      stats.innerText += "dragon status effects: " + dragon.status_effects.map(describe_effect) + "\n";

      if (is_knight_turn) {
        knight.run_status_effects(display_status_effect);

        var result = await knight_actions.get_action();
        if (result instanceof Combat.Run) {
          text.innerText += "Tried to run away...\n";
          await sleep(500);
          if(Math.random() < 0.25) {
            text.innerText += "Got away safely!\n";
            ran = true;
            break;
          } else {
            text.innerText += "but could'nt!\n";
          }
        } else {
          knight.damage(result.dmg_to_self);
          dragon.damage(result.dmg_to_enemy);
          text.innerText += result.description + "\n";
        }
      } else {
        dragon.run_status_effects(display_status_effect);

        await sleep(500);
        var result = await dragon_actions.get_action();
        dragon.damage(result.dmg_to_self);
        knight.damage(result.dmg_to_enemy);
        text.innerText += result.description + "\n";
      }
      await sleep(500);
      is_knight_turn = !is_knight_turn;
    }

    if (!ran) {
      if (knight.hp) {
        text.innerText += "You won!\n";
        knight.level++;
        knight.status_effects = [];
        await sleep(1000);
      } else {
        text.innerText += "You died :(!\n";
        return;
      }
    }
  }
})();
