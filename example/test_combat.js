import * as Combat from '/src/combat.js';
import * as ui from '/src/ui.js';
import {Game} from '/src/game.js';
import {Player} from '/src/characters.js';
import {Knight, get_dragon} from './test_combat_impl.js';
import {assets} from '/src/assets.js';

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

window.knight = knight;
window.Me = Me;

Me.party.push(knight);
var me = Me.renderer;

var game = new Game(Me);

assets.loadImages({
  base_path: './assets/backgrounds',
  wasteland: 'creepy_wasteland.jpg',
});

var fight_scene = new ui.Scene({
  name: 'battle_knight',
  cleanup: true,
  contents: async function(game) {
    console.log(game);
    var knight = game.player.party[0];
    var dragon = await get_dragon(knight.level);
    var member = null;
    return [
      "Ready to fight?",
      "Choose your fighter!",
      ui.setBackground(assets.images.get('wasteland')),
      new ui.Action(async function() {
        member = await Combat.select_party_member(game, ui.get_textbox(), {});
        console.log("chose", member);
      }),
      new Combat.RunGame(game, {
        hero: function get_hero() {
          console.log(member.hp, member.status_effects);
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
          console.log(hero, enemy, enemy.level);
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
              ["nah fam", ui.NO_ACTION],
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
  await knight.loaded;
  await assets.wait_for_load();
  ui.initialize(document.body, game, [
    fight_scene,
  ]);
  fight_scene.run(game);
})();
