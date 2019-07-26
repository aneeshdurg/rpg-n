import {Action, TabbedMenu} from './actions.js';
import {ui} from './ui.js';

import * as UI from './ui.js';
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
    if (!(move instanceof Move))
      throw new Error("Expected instance of Combat.Move");
    this.moves.push(move);
  }

  forget_move(move) {
    var move_idx = this.moves.indexOf(move);
    if (move_idx >= 0) {
      this.moves.splice(move_idx, 1);
    }
  }

  damage(dmg) {
    if (!(dmg instanceof Damage))
      throw new Error("Expected instance of Combat.Damage");

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
    return new UIActionSelector(this, enemy, ui.textbox);
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

    this.attack = document.createElement("button");
    this.attack.innerText = "(a)ttack";
    this.attack.classList.add("action-button", "nes-btn", "is-primary");
    this.actions.appendChild(this.attack);

    this.run = document.createElement("button");
    this.run.innerText = "run";
    this.run.classList.add("action-button", "nes-btn", "is-error");
    this.actions.appendChild(this.run);


    this.items = document.createElement("button");
    this.items.innerText = "items";
    this.items.classList.add("action-button", "nes-btn", "is-warning");
    this.actions.appendChild(this.items);

    this.party = document.createElement("button");
    this.party.innerText = "party";
    this.party.classList.add("action-button", "nes-btn", "is-disabled");
    this.actions.appendChild(this.party);

  }

  gen_moves_menu(resolver) {
    var that = this;
    return function() {
      var container = document.createElement("div");

      that.actions.style.display = "none";
      that.actions.parentElement.appendChild(container);
      container.style.width = "100%";
      container.style.height = "100%";

      function cleanup() {
        that.actions.style.display = "";
        container.remove();
        ui.deactivate_secondary_display();
      }

      container.onclick = function(e) {
        if (e.target == container)
          cleanup();
      }

      var exit_btn = document.createElement("button");
      exit_btn.classList.add("inventory-item", "nes-btn");
      exit_btn.innerText = "Back";
      exit_btn.style.marginBottom = "1em";
      exit_btn.addEventListener('click', function() { cleanup(); });
      container.appendChild(exit_btn);

      var move_buttons = [];

      for (var move of that.hero.moves) {
        var move_btn = document.createElement("button");
        move_btn.classList.add("attack-btn", "nes-btn");

        move_btn.innerText = move.name;
        move_btn.move = move;
        move_buttons.push(move_btn);

        container.appendChild(move_btn);
      }

      function click_handler(e) {
        cleanup();
        that.selected_action = e.target.move;
        resolver();
      }
      move_buttons.map((e) => { e.addEventListener('click', click_handler); });

      container.appendChild(document.createElement("br"));
    }
  }

  gen_items_menu(resolver) { // TODO turn Menu into this table
    var that = this;
    var types = {"potions":[], "weapons":[], "equipment":[], "misc":[]};

    for (let type of Object.getOwnPropertyNames(types)) {
      for (let idx in that.hero.backpack[type]) {
        let item = document.createElement("div");
        item.className = "inventory-item nes-btn";
        item.innerHTML = that.hero.backpack[type][idx].name;

        let callback = (function() {
            return function() {
              that.selected_action = that.hero.backpack[type].remove(idx);
              resolver();
            }
        })();

        types[type].push({
          element: item,
          callback: callback,
        });
      }
    }

    var menu = new TabbedMenu(ui, types, true);
    return menu;
  }

  async _get_action() {
    this.selected_action = null;
    this.parent.innerHTML = "";
    this.parent.appendChild(this.actions);

    var resolver = null;
    var action_done = new Promise((r) => { resolver = r; });

    var that = this;
    var run_handler = function() { that.selected_action = "run"; resolver(); };
    this.run.addEventListener('click', run_handler);

    var move_handler = this.gen_moves_menu(resolver);
    this.attack.addEventListener('click', move_handler);

    var item_menu = this.gen_items_menu(resolver);
    var item_handler = function() {
      item_menu.run();
    };
    this.items.addEventListener('click', item_handler);

    await action_done;

    this.run.removeEventListener('click', run_handler);
    this.attack.removeEventListener('click', move_handler);
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
      return new RunResult(); // special run move that needs to be processed differently
    } else if (action instanceof Move) {
      var result = await action.use_move(this.enemy);
      return result;
    }
  }
}

export class RunResult extends MoveResult {
  constructor() {
    super(new Damage(0), new Damage(0), "run");
  }
}

class HpObj {
  static get hp_bar_height() { return 25; }

  _to_num(prop) {
    return Number((prop + "").replace('px', ''));
  }

  constructor(character, is_below) {
    this.character = character;
    this.is_below = is_below;


    this.hp_bar = document.createElement('label');
    this.set_hp_bar_style();

    var that = this;
    this.onresize = function() {
      that.set_hp_bar_style();
    }
    window.addEventListener('resize', this.onresize);

    this.status = document.createElement('p');
    this.status.style.position = "absolute";
    this.status.style.top = 4;
    this.status.style.left = "1em"; // TODO also text color and stuff

    this.progress = document.createElement('progress');
    this.progress.classList.add("nes-progress", "is-success");
    this.progress.style.height = HpObj.hp_bar_height;
    this.progress.max = this.character.max_hp;

    this.hp_bar.appendChild(this.status);
    this.hp_bar.appendChild(this.progress);
    this.character.active_sprite.parentElement.appendChild(this.hp_bar);
    this.progress.value = 0;
  }

  set_hp_bar_style() {
    var style = window.getComputedStyle(this.character.active_sprite);
    this.hp_bar.style.position = "absolute";
    if (this.is_below) {
      this.hp_bar.style.bottom = this._to_num(style.bottom) + this._to_num(style.marginBottom) - HpObj.hp_bar_height;
    } else {
      this.hp_bar.style.top = this._to_num(style.top) + this._to_num(style.marginTop) - HpObj.hp_bar_height;
    }
    this.hp_bar.style.left = this._to_num(style.left) + this._to_num(style.marginLeft) + this._to_num(style.width) / 4;
    this.hp_bar.style.width = this._to_num(style.width) / 2;
  }

  async draw_hp () {
    if (this.character.hp == this.progress.value)
      return;

    var resolver = null;
    var drawing_done = new Promise((r) => { resolver = r; });

    var total_time = 250; // time to animate in ms
    var time_per_redraw = 10;
    var hp_per_ms = Math.abs(this.progress.value - this.character.hp) / total_time;
    var hp_per_step = hp_per_ms * time_per_redraw;

    var counter = 0;
    var that = this;
    (function redraw() {
      if (that.progress.value > that.character.hp) {
        that.progress.value = Math.max( that.progress.value - hp_per_step, that.character.hp);
      } else if (that.progress.value < that.character.hp) {
        that.progress.value = Math.min( that.progress.value + hp_per_step, that.character.hp);
      }


      that.progress.className = "";
      that.progress.classList.add("nes-progress");
      if (that.progress.value < (that.character.max_hp / 4)) {
        that.progress.classList.add("is-error");
      } else if (that.progress.value < (that.character.max_hp / 2)) {
        that.progress.classList.add("is-warning");
      } else {
        that.progress.classList.add("is-success");
      }

      // TODO render text outside of progress
      that.status.innerText =
        "Lvl: " + that.character.level + " | HP: " + Math.floor(that.progress.value) + "/" + Math.round(that.character.max_hp);

      if (that.progress.value != that.character.hp) {
        setTimeout(redraw, 10);
      } else {
        resolver();
      }
    })();

    await drawing_done;
  }

  destroy() {
    this.hp_bar.remove();
    window.removeEventListener('resize', this.onresize);
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
export class RunCombat extends Action {
  constructor(game, params) {
    super(() => {});

    this.game = game;
    this.params = RunCombat.sanitize_params(params);
    this.initial_text = this.params.initial_text || "";
    this.hero = params.hero; // TODO check that this exists allow it to be a CombatCharacter or a function
    this.enemy = params.enemy;

    this.textbox = ui.textbox;
  }

  clear_until() {
    this.params.until = ((h, e) => true);
    this.params.on_until_reached = ((h, e) => false);
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

    if (result instanceof RunResult) {
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

  async draw_stats(character, is_below) {
    var hp_obj = new HpObj(character, is_below);
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
    this.hero_hp.destroy();
    delete this["hero_hp"];
  }

  async remove_enemy_stats() {
    this.enemy_hp.destroy();
    delete this["enemy_hp"];
  }

  async setup() {
    if (this.hero instanceof Function) {
      this.hero = await this.hero();
    }

    if (this.enemy instanceof Function) {
      this.enemy = await this.enemy();
    }

    this.hero.active_sprite = this.hero.hero_sprite;
    await ui.draw(this.hero.active_sprite, Positions.CenterLeft, {height: "512px"}, 'zoomIn').run();

    this.enemy.active_sprite = this.enemy.enemy_sprite;
    await ui.draw(this.enemy.active_sprite, Positions.UpRight, {height: "512px"}, 'zoomIn').run();

    if (this.initial_text) {
      this.textbox.innerText = this.initial_text;
      await ui.wait_for_click();
    }

    await this.draw_hero_stats();
    await this.draw_enemy_stats();

    this.is_hero_turn = true; // TODO allow for first turn to be enemy turn
    this.setup_done = true;
  }

  async run() {
    if (this.combat_done) {
      throw new Error("Cannot run combat scene because combat has ended");
    }

    if (!this.setup_done) {
      await this.setup();
    }

    var hero_actions = this.hero.action_selector(this.enemy);
    var enemy_actions = this.enemy.action_selector(this.hero);

    this.ran = false;
    var until_reached = false;

    while(this.enemy.hp && this.hero.hp && (!this.ran)) {
      // TODO statuseffect animations?

      if (this.is_hero_turn) {
        await this.run_turn(this.hero, hero_actions, this.enemy);
      } else {
        await this.run_turn(this.enemy, enemy_actions, this.hero);
      }

      await ui.delay(500).wait();
      this.is_hero_turn = !this.is_hero_turn;
      if (!this.params.until()) {
        until_reached = true;
        break;
      }
    }

    if (until_reached) {
      if (!this.params.on_until_reached(this.game, this.hero, this.enemy))
        return;
    }

    this.combat_done = true;

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

// TODO return the action
export async function select_party_member(game, filter, canCancel) {
  filter = filter || ((e) => true);
  canCancel = Boolean(canCancel);

  var party_menu = {party: []};

  for (let member of game.player.party) {
    if (!filter(member)) {
      continue;
    }

    var list_entry = document.createElement("div");
    list_entry.className = "party-list-entry";

    var element = document.createElement("button");
    element.classList.add("party-element", "nes-btn");

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
    list_entry.appendChild(element);

    party_menu.party.push({
      element: list_entry,
      callback: () => member,
    });
  }

  return await (new TabbedMenu(ui, party_menu, canCancel, true)).run();
}

export class Scene extends UI.Scene {
}
