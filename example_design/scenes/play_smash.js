import * as Positions from '../../src/positions.js';
import * as Combat from '../../src/combat.js';

import {assets} from '../../src/assets.js';
import {ui, Draw, Scene} from '../../src/ui.js';
import {Action} from '../../src/actions.js';
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
        member = await Combat.select_party_member(game, ui.textbox, {});
      }),
      s("Awesome, let's fight!"),
      new Action(async function() {
        await Draw.animate(Sonic.sprite, "zoomOut", {noCancel: true}).run();
        Sonic.sprite.remove();
      }),
      new Combat.RunGame(game, {
        initial_text: "Sonic would like to battle!\n",
        hero: function get_hero() {
          return member;
        },
        enemy: Sonic,
        // until: (() => false), TODO create a way to "resume" a battle that's
        // reached the todo phase
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
      "...",
    ];
  },
});
