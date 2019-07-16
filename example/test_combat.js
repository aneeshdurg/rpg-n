import * as Actions from '../src/actions.js';
import * as Combat from '../src/combat.js';
import * as UI from '../src/ui.js';

import {Action} from '../src/actions.js';
import {assets} from '../src/assets.js';
import {Player} from '../src/characters.js';
import {Game} from '../src/game.js';
import {ui} from '../src/ui.js';

import {Knight, get_dragon} from './test_combat_impl.js';

window.Combat = Combat;

var Me = new Player('Me', 'green');
var knight = Knight.from_obj({
  constructor_args: [],
  assets: {
    images: {
      base_path: './assets/combat_demo/',
      heroSprite: 'knight.png',
      enemySprite: 'knight.png',
    }
  }
});

Me.party.push(knight);
var me = Me.renderer;

var game = new Game(Me);

assets.loadImages({
  base_path: './assets',
  wasteland: 'backgrounds/creepy_wasteland.jpg',
  fist: 'combat_demo/fist.png',
  fire: 'combat_demo/fire.png',
});

assets.loadAudio({
  base_path: './assets/audio',
  fireball: '431174__highpixel__fireball-explosion.wav',
  punch: '118513__thefsoundman__punch-02.wav',
});
var fight_scene = new UI.Scene({
  name: 'battle_knight',
  cleanup: true,
  contents: async function(game) {
    var knight = game.player.party[0];
    var dragon = await get_dragon(knight.level);
    var member = null;
    return [
      "Ready to fight?",
      "Choose your fighter!",
      ui.setBackground(assets.images.get('wasteland')),
      new Action(async function() {
        member = await Combat.select_party_member(game, ui.textbox, {});
      }),
      new Combat.RunGame(game, {
        initial_text: "Encountered a ferocious dragon!\n",
        hero: function get_hero() {
          return member;
        },
        enemy: dragon,
        allow_run: {
          run_chance: 0.25,
        },
        on_win: (game, hero, enemy) => {
          // TODO level based events
          //  e.g. learning moves, evolving, etc
          //  some of those may require interactive actions!
          hero.exp += enemy.level * 5;
          game.flags.set('victory', 1);
        },
        on_run: (game, hero, enemy) => {
          game.flags.set('victory', 0);
        },
        on_lose: (game) => {
          game.flags.set('victory', -1);
        },
      }),
      ui.exec((game) => {
        if (game.flags.get('victory') >= 0) {
          if (game.flags.get('victory') == 1) {
            var new_dragon = Combat.InteractiveCharacter.from_non_interactive(dragon)
            new_dragon.hp = new_dragon.max_hp;
            new_dragon.status_effects = [];
            Me.party.push(new_dragon);
            // TODO fix the following text to accurately reflect if the dragon
            // joined the party
          }
          return ui.sequence(
            new_dragon.name + " joined the party!",
            "Continue adventuring?",
            ui.choice(
              ["yeet", 'battle_knight'],
              ["nah fam", Actions.NO_ACTION],
            ),
            ui.clearScene(500),
            "Good bye!",
          );
        }
        return ui.sequence(
          "Lol u lost",
          ui.delay(1000),
          ui.exec(() => { location.reload(); }),
        );
      }),
    ]
  },
});

(async function() {
  await knight.wait_for_load();
  await assets.wait_for_load();

  ui.initialize(document.body, game, [
    fight_scene,
  ]);
  fight_scene.run(game);
})();


window.knight = knight;
window.Me = Me;
window.assets = assets;
