import * as Positions from '../../../src/positions.js';
import * as Combat from '../../../src/combat.js';

import {assets} from '../../../src/assets.js';
import {ui, Draw, Scene} from '../../../src/ui.js';
import {Action} from '../../../src/actions.js';
import {game, Me, me, Sonic, s} from '../setup.js';

export var play_smash = new Scene({
  name: 'play_smash',
  cleanup: true,
  contents: async function (game) {
    var member = null;
    return [
      ui.setBackground(assets.images.get('apartment')),
      ui.draw(Sonic.sprite, Positions.Left),
      s("Select your fighter!"),
      new Action(async function() {
        member = await Combat.select_party_member(game);
      }),
      s("Awesome, let's fight!"),
      ui.setBackground(assets.images.get('battlefield')),
      new Action(async function() {
        await Draw.animate(Sonic.sprite, "zoomOut", {noCancel: true}).run();
        Sonic.sprite.remove();
      }),
      new Combat.RunCombat(game, {
        initial_text: "Sonic would like to battle!\n",
        hero: function get_hero() {
          return member;
        },
        enemy: Sonic,
        on_win: (game, hero, enemy) => {
          console.log("won!");
          hero.exp += enemy.level * 5;
          game.flags.set('victory', 1);
        },
        on_run: (game, hero, enemy) => {
          game.flags.set('victory', 0);
        },
        on_lose: (game) => {
          console.log("lost!");
          game.flags.set('victory', -1);
        },
      }),
      ui.clearScene(500),
      ui.setBackground(assets.images.get('apartment')),
      ui.draw(Sonic.sprite, Positions.Left),
      ui.exec((game) => {
        var fight_result = game.flags.get('victory');
        if (fight_result == 1) {
          return ui.jump('ssb_win');
        } else if (fight_result == 0) {
          return ui.sequence(
            Me("This was pretty boring..."), // TODO more content
            ui.jump('bad_ending'),
          );
        } else {
          return ui.jump('ssb_lose');
        }
      }),
    ];
  },
});

export var ssb_win = new Scene({
  name: 'ssb_win',
  cleanup: true,
  contents: async function (game) {
    return [
      ui.setBackground(assets.images.get('apartment')),
      ui.draw(Sonic.sprite, Positions.Left),
      ui.exec((game) => {
        if (game.flags.get('sonic_friends') > 0) {
          return ui.sequence(
            s("Nicee"),
            "Wow I actually had fun...",
            me("Lets play again!"),
            ui.jump('credits'),
          );
        }
        return ui.sequence(
          ui.draw(assets.images.get('knife'), Positions.Center, {height: "50%"}, "zoomOut", {asynchronous: true}),
          s("I HATE YOU!!!"),
          "Wow I have poor taste in friends...",
          ui.jump('credits'),
        );
      }),
    ];
  },
});

export var ssb_lose = new Scene({
  name: 'ssb_lose',
  cleanup: true,
  contents: async function (game) {
    return [
      ui.setBackground(assets.images.get('apartment')),
      ui.draw(Sonic.sprite, Positions.Left),
      ui.exec((game) => {
        if (game.flags.get('sonic_friends') > 0) {
          return ui.sequence(
            s("Nicee"),
            "Wow I actually had fun...",
            me("Lets play again!"),
            ui.jump('credits'),
          );
        }
        return ui.jump('bad_ending');
      }),
    ];
  },
});

