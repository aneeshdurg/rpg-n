import * as Combat from '/src/combat.js';
import * as ui from '/src/ui.js';
import {Game} from '/src/game.js';
import {Player} from '/src/characters.js';
import {assets} from '/src/assets.js';

assets.loadImages({
  base_path: './assets',
  mario: 'backgrounds/mario_background.png',
  school: 'backgrounds/creepy_wasteland.jpg',
  coin: 'coin.png',
});

assets.loadAudio({
  base_path: './assets/audio/',
  happy: '335361__cabled-mess__little-happy-tune-22-10.wav',
  coin: '135936__bradwesson__collectcoin.wav',
});

export var Sonic = Combat.Character.from_obj({
  constructor_args: ['Sonic', 'blue'],
  assets: {
    images: {
      base_path: './assets/sonic',
      heroSprite: 'sonic.png',
      enemySprite: 'sonic.png',
      silhouette: 'sonic_silhouette.png',
    },
  },
});
export var s = Sonic.renderer;

export var Me = new Player('Me', 'green');
export var me = Me.renderer;

export var game = new Game(Me);
