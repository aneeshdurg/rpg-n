import * as Combat from '/src/combat.js';
import * as ui from '/src/ui.js';

import {assets} from '/src/assets.js';
import {Game} from '/src/game.js';
import {Player} from '/src/characters.js';
import {Scene} from '/src/ui.js';

import {game, Me, me, Sonic, s} from './setup.js';
import {entry} from './scenes/intro.js';

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
  // TODO wait for loaded
  ui.initialize(document.body, game, [
    splashscreen,
    entry,
  ]);
  splashscreen.run(game);
})();
