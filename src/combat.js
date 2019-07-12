import * as ui from './ui.js';
import * as Characters from './characters.js';
import * as Text from './text.js';
import * as Items from './items.js';
import * as Positions from './positions.js';

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
export class MoveTypes {
  constructor(heirarchy) {
    for (var key of Object.keys(heirarchy)) {
      this[key] = {};
      function get_map(list) {
        var map = new Map();
        for (var entry of list) {
          if (entry instanceof Array) {
            map.set(entry[0], entry[1]);
          } else {
            map.set(entry, 1);
          }
        }

        return map;
      }
      this[key].advantage = get_map(heirarchy[key].advantage || []);
      this[key].disadvantage = get_map(heirarchy[key].disadvantage || []);
    }
  }

  advantage(typeA, typeB) {
    if (!this[typeA] || !this[typeB])
      throw new Error('Invalid arguments!');

    return typeA.advantage.get(typeB);
  }


  disadvantage(typeA, typeB) {
    if (!this[typeA] || !this[typeB])
      throw new Error('Invalid arguments!');

    return typeA.disadvantage.get(typeB);
  }
}

export class Damage {
  constructor(types, dp, statuseffect) {
    this.types = types;
    this.dp = dp;
    this.statuseffect = statuseffect;
  }
}

export class MoveResult {
  constructor(dmg_to_self, dmg_to_enemy, description) {
    this.dmg_to_self = dmg_to_self; // type Damage
    this.dmg_to_enemy = dmg_to_enemy; // type Damage
    this.description = description; // type [str]
  }
}

export class Move {
  constructor(user, types, sfx) {
    this.user = user;
    this.types = new Set(types); // MoveType's TODO verify that these types exist
    this.sfx = sfx;
  }

  // TODO Maybe this should be a part of some subclass's logic?
  //is_battle_move() {
  //  return true;
  //}

  //can_use_outside_battle() {
  //  return false;
  //}

  use_move(victim) {
    //returns MoveResult
    // don't modify victim!!!
  }
}

export class StatusEffect {
  // origin is the character who caused the effect
  constructor(origin) {
    this.origin = origin;
  }

  pause() {}
  // this.rolling_interval;
  rolling_effect(victim) {} // run effect if this.rolling_interval > 0 every this.rolling_interval ms

  // when on_turn returns null, the effect will be stopped
  on_turn(victim) {} // run effect once during battle don't modify victim!
}

// A character capable of fighting
export class Character extends Characters.Character {
  constructor(name, color, types, sprites) {
    super(name, color);

    this._level = 0;
    this._hp = 0;
    this.max_hp = 0;
    this.types = types;
    this.moves = [];
    this.status_effects = [];

    this.backpack = new Items.Backpack();
    // TODO ?
  }

  action_selector(enemy) {
    return new ActionSelector(this, enemy);
  }

  get hp() { return this._hp; }

  set hp(x) {
    this._hp = Math.min(Math.max(x, 0), this.max_hp);
  }

  get level() {
    return this._level;
  }

  set level(x) {
    this._level = x;
    this.max_hp = x * 100;
    this.hp = this.max_hp;
  }

  get enemy_sprite() {
    return this.assets.images.get('enemySprite');
  }

  get hero_sprite() {
    return this.assets.images.get('heroSprite');
  }

  add_move(move) {
    // TODO verify that move is an instanceof Move
    this.moves.push(move);
  }

  forget_move(move) {
    // TODO mark moves as forgettable or something?
    var move_idx = this.moves.indexOf(move);
    if (move_idx >= 0) {
      this.moves.splice(move_idx, 1);
    }
  }

  damage(dmg) {
    // TODO check dmg type
    this.hp -= dmg.dp;
    if (dmg.statuseffect) {
      this.status_effects.push(dmg.statuseffect);
      // TODO allow for status effect animation/sfx/etc
    }
  }

  async run_status_effects(description_handler) {
    description_handler = description_handler || ((e, r) => {});

    var to_delete = [];
    for (var idx in this.status_effects) {
      var effect = this.status_effects[idx];
      var result = effect.on_turn(this)
      if (!result) {
        await description_handler(effect, result);
        to_delete.push(idx);
      } else {
        effect.origin.damage(result.dmg_to_self);
        this.damage(result.dmg_to_enemy);
        await description_handler(effect, result);
      }
    }

    var counter = 0;
    for (var idx of to_delete) {
      this.status_effects.splice(idx + counter, 1);
      counter++;
    }
  }
}

export class InteractiveCharacter extends Character {
  static from_non_interactive(character) {
    console.log(character);
    var interactive_character = new InteractiveCharacter(character.name, character.color, character.types);

    interactive_character._level = character._level;
    interactive_character._hp = character._hp;
    interactive_character.max_hp = character.max_hp;
    interactive_character.types = character.types;
    interactive_character.moves = character.moves;
    interactive_character.status_effects = character.status_effects;

    interactive_character.backpack = character.backpack;
    interactive_character.assets = character.assets;
    interactive_character.loaded = character.loaded;
    return interactive_character;
  }

  action_selector(enemy) {
    console.log("action selector for " + this.name + " generated!");
    return new UIActionSelector(this, enemy, ui.get_textbox());
  }
}

// This class defines the interface for choosing actions
// This will allow for both an interactive character as well as an AI driven
// character
export class ActionSelector {
  constructor(hero, enemy) {
    this.hero = hero;
    this.enemy = enemy;
  }

  // returns MoveResult
  async get_action() {
    await ui.delay(500).wait();
    if (this.hero.hp < (0.5 * this.hero.max_hp)) {
      if (this.hero.backpack.potions.length) {
        var potion_idx = Math.floor(Math.random() * this.hero.backpack.potions.length);
        return this.hero.backpack.potions.remove(potion_idx).use();
      }
    }

    var move_idx = Math.floor(Math.random() * this.hero.moves.length);
    return this.hero.moves[move_idx].use_move();
  }
}

export class UIActionSelector extends ActionSelector {
  constructor(hero, enemy, parent) {
    super(hero, enemy);

    this.parent = parent;

    this.selected_action = null;

    this.actions = document.createElement("div");

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
      that.table = document.createElement("table");
      that.table.id = "itemsTable";

      var potions_row = document.createElement("tr");
      for (var idx in that.hero.backpack.potions) {
        var item = document.createElement("th");
        item.innerHTML = "potion";
        item.addEventListener('click', (function() {
          return function() {
            resolver();
            that.selected_action = that.hero.backpack.potions.remove(idx);
          }
        })());
        potions_row.appendChild(item);
      }

      that.table.appendChild(potions_row);
      that.actions.appendChild(that.table);
    }
  }

  async _get_action() {
    this.selected_action = null;
    this.parent.innerHTML = "";
    this.parent.appendChild(this.actions);

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

    if (this.table)
      this.table.remove();

    this.punch.removeEventListener('click', click_handler);
    this.run.removeEventListener('click', click_handler);
    this.items.removeEventListener('click', item_handler);

    this.actions.remove();

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
      var result = this.hero.moves[0].use_move();// TODO allow using more than one move!
      return result;
    }
  }
}

class RunCombat extends ui.Action {}

// Combat.scene will process certain Actions that ui.Scene cannot. e.g. RunCombat
//// How a fight scene works:
//  Enemy party is summoned
//  Hero party is summoned
//  determine who goes first
//  while (!end_condition()) {
//    hero_action = get_hero_action();
//    enemy_action = get_enemy_action();
//    if (hero_first) {
//      hero_action();
//      enemy_action();
//    } else {
//      enemy_action();
//      hero_action();
//    }
//    if (hero_lost()) {
//      on_lose();
//    } else if (enemy_lost()) {
//      on_win();
//    }
//  }
export class Run extends MoveResult {
  constructor() {
    super(new Damage(0), new Damage(0), "run");
  }
}

/**
 * params:
 *   allow_run:
 *      run_chance:
 *   on_lose:
 *   on_win:
 *   on_run:
 *   until:
 *   on_until_reached;
 *
 * returns Action?
 */
export class RunGame extends ui.Action {
  constructor(game, params) {
    super(() => {});

    this.game = game;
    this.params = RunGame.sanitize_params(params);
    this.hero = params.hero; // TODO check that this exists allow it to be a CombatCharacter or a function
    this.enemy = params.enemy;

    this.textbox = ui.get_textbox();
    this.stats = document.createElement("pre");
    document.body.appendChild(this.stats);
  }

  static sanitize_params(params) {
    params.allow_run = params.allow_run || false;
    if (params.allow_run) {
      // TODO allow 0.25 to be configured
      params.allow_run = {
        run_chance: params.allow_run.run_chance || 0.25,
      };
    }

    params.until = params.until || ((h, e) => true);
    if (params.until)
      params.on_until_reached = params.on_until_reached || ((h, e) => false);

    params.on_win = params.on_win; // TODO make win/lose handlers
    params.on_lose = params.on_lose; // TODO make win/lose handlersS

    return params;
  }

  describe_effect(effect) {
    return effect.constructor.name + "(" + effect.level + ")";
  }

  display_status_effect(effect, result) {
    if (result) {
      this.textbox.innerText += result.description + "\n";
    } else {
      this.textbox.innerText += "Effect " + this.describe_effect(effect) + " ended.\n";
    }
  }

  async run_turn(player1, player1_actions, player2) {
    await player1.run_status_effects(this.display_status_effect.bind(this));

    var result = await player1_actions.get_action();
    if (result instanceof Run) {
      this.textbox.innerText += "Tried to run away...\n";
    await ui.delay(500).wait();
      if(this.params.allow_run && Math.random() < this.params.allow_run.run_chance) {
        this.textbox.innerText += "Got away safely!\n";
        this.ran = true;
        return;
      } else {
        this.textbox.innerText += "but couldn't!\n";
      }
    } else {
      player1.damage(result.dmg_to_self);
      player2.damage(result.dmg_to_enemy);
      this.textbox.innerText += result.description + "\n";
    }
  }

  async run() {
    if (this.hero instanceof Function) {
      this.hero = this.hero();
    }

    if (this.enemy instanceof Function) {
      this.enemy = this.enemy();
    }

    await ui.Draw.draw(this.hero.hero_sprite, Positions.CenterLeft, {height: "512px"}, 'zoomIn').run();
    await ui.Draw.draw(this.enemy.enemy_sprite, Positions.UpRight, {}, 'zoomIn').run();

    this.textbox.innerText = "Encountered a ferocious dragon!\n"; // TODO ???
    await ui.delay(1000).wait();

    var hero_actions = this.hero.action_selector(this.enemy);
    var enemy_actions = this.enemy.action_selector(this.hero);

    this.ran = false;
    var until_reached = false;
    var is_hero_turn = true;


    while(this.enemy.hp && this.hero.hp && (!this.ran)) {
      // TODO display stats
      this.stats.innerText = "hero hp: " + this.hero.hp + " level: " + this.hero.level + "\n";
      this.stats.innerText += "hero status effects: " + this.hero.status_effects.map(this.describe_effect) + "\n";
      this.stats.innerText += "enemy hp: " + this.enemy.hp + " level: " + this.enemy.level + "\n";
      this.stats.innerText += "enemy status effects: " + this.enemy.status_effects.map(this.describe_effect) + "\n";

      if (is_hero_turn) {
        await this.run_turn(this.hero, hero_actions, this.enemy);
      } else {
        await this.run_turn(this.enemy, enemy_actions, this.hero);
      }

      await ui.delay(500).wait();
      is_hero_turn = !is_hero_turn;
      if (!this.params.until()) {
        until_reached = true;
        break;
      }
    }

    if (until_reached) {
      if (!this.params.on_until_reached(this.game, this.hero, this.enemy))
        return;
    }

    if (!this.ran) {
      if (this.enemy.hp) {
        this.hero.hero_sprite.remove();
        this.params.on_lose(this.game, this.hero, this.enemy);
      } else {
        this.enemy.enemy_sprite.remove();
        this.params.on_win(this.game, this.hero, this.enemy);
      }
    } else {
      this.enemy.enemy_sprite.remove();
      this.hero.hero_sprite.remove();
      this.params.on_run(this.game, this.hero, this.enemy);
    }
  }
}

// TODO finish this!!!
// params:
//  allowCancel
//  filter
export async function select_party_member(game, parent, params) {
  // TODO allow customizing this function...maybe make it a method of Combat.Scene?
  var filter = params.filter || ((e) => true);
  var allowCancel = Boolean(params.allowCancel);

  var resolver = null;
  var selected_member = null;
  var selection_done = new Promise((r) => { resolver = r; });

  // TODO add text indicating cancellable
  var container = document.createElement("div");
  container.className = "party-list-div";
  container.onclick = function(e) {
    if (allowCancel && (e.target == container)) {
      container.remove();
      resolver();
    }
  }

  var list = document.createElement("ul");
  list.className = "party-list";
  container.appendChild(list);

  for (var member of game.player.party) {
    if (!filter(member)) {
      continue;
    }

    var list_entry = document.createElement("li");
    list_entry.className = "party-list-entry";

    var element = document.createElement("div");
    element.className = "party-element";

    var icon = member.sprite.cloneNode();
    icon.style = {};
    icon.className = "party-icon";

    var description = document.createElement("p");
    description.className = "party-description";
    description.appendChild(icon);
    description.innerHTML += Text.with_color(member.color, member.name);

    element.appendChild(description);
    element.onclick = (function() {
      return function() {
        resolver();
        selected_member = member;
      }
    })();

    list_entry.appendChild(element);
    list.appendChild(list_entry);
  }

  parent.appendChild(container);
  await selection_done;
  return selected_member;
}

export class Scene extends ui.Scene {
}
