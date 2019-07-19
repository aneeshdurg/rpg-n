import * as Combat from '../src/combat.js';

import {assets} from '../src/assets.js';
import {Player} from '../src/characters.js';
import {Game} from '../src/game.js';
import {ui, Scene} from '../src/ui.js';

import {game, Me, me, Sonic, s} from './setup.js';
import {entry} from './scenes/intro.js';
import {play_smash} from './scenes/play_smash.js';

var splashscreen = new Scene({
    name: 'splashscreen',
    cleanup: true,
    contents: async function(game) {
      return [
        "Welcome to the rpg-n demo!",
        ui.jump('intro'),
      ]
    },
});

window.game = game;

(async function() {
  await Sonic.wait_for_load();
  await assets.wait_for_load();

  game.initialize(document.body, [
    splashscreen,
    entry,
    play_smash,
  ]);
  game.run();
})();
