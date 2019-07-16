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

    return this[typeA].advantage.get(typeB);
  }


  disadvantage(typeA, typeB) {
    if (!this[typeA] || !this[typeB])
      throw new Error('Invalid arguments!');

    return this[typeA].disadvantage.get(typeB);
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

  get name() {
    return this.constructor.name;
  }

  //returns MoveResult
  // don't modify victim!!!
  async use_move(victim) { }
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
  constructor(name, color, types, type_info) {
    super(name, color);

    this._level = 0;
    this._hp = 0;
    this._exp = 0;
    this.max_hp = 0;
    this.types = new Set(types);
    this.type_info = type_info;
    this.moves = [];
    this.status_effects = [];

    this.backpack = new Items.Backpack();
  }

  action_selector(enemy) {
    return new ActionSelector(this, enemy);
  }

  get hp() { return this._hp; }

  set hp(x) {
    this._hp = Math.min(Math.max(x, 0), this.max_hp);
  }

  get exp() {
    return this._exp;
  }

  set exp(amt) {
    // to get to level `n` you need 10^(n-1) exp pts
    this._exp = amt;
    this.level = Math.floor(Math.log10(amt)) + 1;
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
    var modifier = 0;
    for (var type of this.types) {
      for (var dmg_type of dmg.types) {
        modifier -= this.type_info.advantage(type, dmg_type) || 0;
        modifier += this.type_info.disadvantage(type, dmg_type) || 0;
      }
    }
    modifier = Math.pow(2, modifier);

    this.hp -= dmg.dp * modifier;
    if (dmg.statuseffect) {
      this.status_effects.push(dmg.statuseffect);
      // TODO allow for status effect animation/sfx/etc
    }
    // TODO allow displaying tings like "attack was super effective!"
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
    var interactive_character = new InteractiveCharacter(character.name, character.color, character.types, character.type_info);

    interactive_character._level = character._level;
    interactive_character._hp = character._hp;
    interactive_character.max_hp = character.max_hp;
    interactive_character.moves = character.moves;
    interactive_character.status_effects = character.status_effects;

    interactive_character.backpack = character.backpack;
    interactive_character.assets = character.assets;
    interactive_character.loaded = character.loaded;
    return interactive_character;
  }

  action_selector(enemy) {
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
    return await this.hero.moves[move_idx].use_move(this.enemy);
  }
}

export class UIActionSelector extends ActionSelector {
  constructor(hero, enemy, parent) {
    super(hero, enemy);

    this.parent = parent;

    this.selected_action = null;

    this.actions = document.createElement("div");

    this.run = document.createElement("button");
    this.run.innerText = "run";
    this.actions.appendChild(this.run);

    this.items = document.createElement("button");
    this.items.innerText = "items";
    this.actions.appendChild(this.items);

  }

  gen_move_buttons() {
    this.move_buttons = [];

    for (var move of this.hero.moves) {
      var move_btn = document.createElement("button");
      move_btn.innerText = move.name;
      move_btn.move = move;
      this.move_buttons.push(move_btn);
      this.actions.appendChild(move_btn);
    }
  }

  gen_items_menu(resolver) {
    var that = this;
    return function() {
      var secondary = ui.activate_secondary_display();

      var container = document.createElement("div");

      secondary.appendChild(container);
      container.style.width = "100%";
      container.style.height = "100%";

      function cleanup() {
        container.remove();
        ui.deactivate_secondary_display();
      }
      container.onclick = function(e) {
        if (e.target == container)
          cleanup();
      }

      that.table = document.createElement("table");
      that.table.id = "itemsTable";

      var potions_row = document.createElement("tr");
      for (var idx in that.hero.backpack.potions) {
        var item = document.createElement("th");
        item.innerHTML = "potion";
        item.addEventListener('click', (function() {
          return function() {
            cleanup();
            that.selected_action = that.hero.backpack.potions.remove(idx);
            resolver();
          }
        })());
        potions_row.appendChild(item);
      }
      var misc_row = document.createElement("tr");
      for (var idx in that.hero.backpack.misc) {
        var item = document.createElement("th");
        item.innerHTML = that.hero.backpack.misc[idx].name;
        item.addEventListener('click', (function() {
          return function() {
            resolver();
            that.selected_action = that.hero.backpack.misc.remove(idx);
          }
        })());
        misc_row.appendChild(item);
      }

      that.table.appendChild(potions_row);
      that.table.appendChild(misc_row);
      container.appendChild(that.table);
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
      if (e.target.move)
        that.selected_action = e.target.move;
      else
        that.selected_action = e.target.innerText;
    };

    this.gen_move_buttons();
    this.move_buttons.map((e) => { e.addEventListener('click', click_handler); });

    this.run.addEventListener('click', click_handler);

    var item_handler = this.gen_items_menu(resolver);
    this.items.addEventListener('click', item_handler);

    await action_done;

    // TODO refactor move_buttons stuff
    this.move_buttons.map((e) => { e.removeEventListener('click', click_handler); e.remove(); });
    this.move_buttons = [];

    this.run.removeEventListener('click', click_handler);
    this.items.removeEventListener('click', item_handler);

    this.actions.remove();

    return this.selected_action;
  }

  async get_action() {
    console.log("called");
    var action = await this._get_action();
    if (action instanceof Items.ItemDescriptor) {
      var item = action;
      var result = item.use();
      return result;
    } else if (action == "run") {
      return new Combat.Run(); // special run move that needs to be processed differently
    } else if (action instanceof Move) {
      var result = await action.use_move(this.enemy);
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

    this.stats = document.getElementsByTagName("pre")[0];
    if (!this.stats) {
      this.stats = document.createElement("pre");
      document.body.appendChild(this.stats);
    }
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
    await this.update_hero_stats();
    await this.update_enemy_stats();

    var result = null;
    while (!result)
      result = await player1_actions.get_action();

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
      this.update_hero_stats();
      this.update_enemy_stats();

      this.textbox.innerText += result.description + "\n";
    }
    await ui.delay(500).wait();
    await ui.wait_for_click();
  }

  _draw_rect(ctx, color, x, y, width, height) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.rect(x, y, width, height);
    ctx.fill();
  }

  _to_num(prop) {
    console.log(prop);
    return Number((prop + "").replace('px', ''));
  }

  async draw_stats(character, is_below) {
    var style = window.getComputedStyle(character.active_sprite);

    var hp_obj = {};
    hp_obj.canvas = document.createElement('canvas');
    character.active_sprite.parentElement.appendChild(hp_obj.canvas);

    hp_obj.canvas.style.position = "absolute";
    if (is_below) {
      hp_obj.canvas.style.bottom = this._to_num(style.bottom) + this._to_num(style.marginBottom);
    } else {
      hp_obj.canvas.style.top = this._to_num(style.top) + this._to_num(style.marginTop);
    }
    hp_obj.canvas.style.left = this._to_num(style.left) + this._to_num(style.marginLeft);
    hp_obj.canvas.width = this._to_num(style.width);
    hp_obj.canvas.height = 20; // ?

    hp_obj.ctx = hp_obj.canvas.getContext('2d');
    hp_obj.width = hp_obj.canvas.width / 2;
    hp_obj.height = hp_obj.canvas.height;

    hp_obj.outer_x = (hp_obj.canvas.width / 2) - (hp_obj.width / 2);
    hp_obj.outer_y = (hp_obj.canvas.height / 2) - (hp_obj.height / 2);

    hp_obj.border = hp_obj.height * 0.1;

    hp_obj.inner_x = hp_obj.outer_x + hp_obj.border;
    hp_obj.inner_y = hp_obj.outer_y + hp_obj.border;

    hp_obj.inner_width = hp_obj.width - 2 * hp_obj.border;
    hp_obj.inner_height = hp_obj.canvas.height - 2 * hp_obj.border;

    this._draw_rect(
      hp_obj.ctx,
      "black",
      hp_obj.outer_x,
      hp_obj.outer_y,
      hp_obj.width,
      hp_obj.height)

    hp_obj._known_hp = 0;//character.hp;

    var that = this;
    hp_obj.draw_hp = async function() {
      if (character.hp == hp_obj._known_hp)
        return;

      var resolver = null;
      var drawing_done = new Promise((r) => { resolver = r; });

      var total_time = 250; // time to animate in ms
      var time_per_redraw = 10;
      var hp_per_ms = Math.abs(hp_obj._known_hp - character.hp) / total_time;
      var hp_per_step = hp_per_ms * time_per_redraw;

      var counter = 0;
      function redraw() {
        if (hp_obj._known_hp > character.hp) {
          hp_obj._known_hp = Math.max( hp_obj._known_hp - hp_per_step, character.hp);
        } else if (hp_obj._known_hp < character.hp) {
          hp_obj._known_hp = Math.min( hp_obj._known_hp + hp_per_step, character.hp);
        }

        that._draw_rect(
          hp_obj.ctx,
          "white",
          hp_obj.inner_x,
          hp_obj.inner_y,
          hp_obj.inner_width,
          hp_obj.inner_height);

        // this has to be defined dynamically incase max_hp changes
        var get_width = function(hp) {
          return (hp / character.max_hp) * hp_obj.inner_width;
        }

        var color = "green";
        if (hp_obj._known_hp < (character.max_hp / 4)) {
          color = "red";
        } else if (hp_obj._known_hp < (character.max_hp / 2)) {
          color = "orange";
        }

        that._draw_rect(
          hp_obj.ctx,
          color,
          hp_obj.inner_x,
          hp_obj.inner_y,
          get_width(hp_obj._known_hp),
          hp_obj.inner_height);

        if (hp_obj._known_hp != character.hp) {
          setTimeout(redraw, 10);
        } else {
          resolver();
        }
      }
      setTimeout(redraw, 10);

      await drawing_done;
    }

    await hp_obj.draw_hp();
    return hp_obj;
  }

  async draw_hero_stats() {
    this.hero_hp = await this.draw_stats(this.hero);
  }

  async draw_enemy_stats() {
    this.enemy_hp = await this.draw_stats(this.enemy, true);
  }

  async update_hero_stats() {
    await this.hero_hp.draw_hp();
  }

  async update_enemy_stats() {
    await this.enemy_hp.draw_hp();
  }

  async remove_hero_stats() {
    this.hero_hp.canvas.remove();
    delete this["hero_hp"];
  }

  async remove_enemy_stats() {
    this.enemy_hp.canvas.remove();
    delete this["enemy_hp"];
  }

  async run() {
    if (this.hero instanceof Function) {
      this.hero = this.hero();
    }

    if (this.enemy instanceof Function) {
      this.enemy = this.enemy();
    }

    this.hero.active_sprite = this.hero.hero_sprite;
    await ui.Draw.draw(this.hero.active_sprite, Positions.CenterLeft, {height: "512px"}, 'zoomIn').run();

    this.enemy.active_sprite = this.enemy.enemy_sprite;
    await ui.Draw.draw(this.enemy.active_sprite, Positions.UpRight, {height: "512px"}, 'zoomIn').run();

    this.textbox.innerText = "Encountered a ferocious dragon!\n"; // TODO ???
    await ui.wait_for_click();

    var hero_actions = this.hero.action_selector(this.enemy);
    var enemy_actions = this.enemy.action_selector(this.hero);

    this.ran = false;
    var until_reached = false;
    var is_hero_turn = true;

    await this.draw_hero_stats();
    await this.draw_enemy_stats();

    while(this.enemy.hp && this.hero.hp && (!this.ran)) {
      // TODO statuseffect animations?
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

    await this.remove_hero_stats();
    await this.remove_enemy_stats();

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
    description.innerHTML += Text.with_color(member.color, member.name) + " ";
    description.innerHTML += "lvl: " + member.level + " ";
    description.innerHTML += "hp: " + member.hp + "/" + member.max_hp + " ";

    element.appendChild(description);
    element.onclick = (function(member) {
      return function(e) {
        resolver();
        selected_member = member;
      }
    })(member);

    list_entry.appendChild(element);
    list.appendChild(list_entry);
  }

  parent.appendChild(container);
  await selection_done;
  return selected_member;
}

export class Scene extends ui.Scene {
}
