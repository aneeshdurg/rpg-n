import * as Combat from '../../src/combat.js';
import {Game} from '../../src/game.js';
import {Player} from '../../src/characters.js';
import {assets} from '../../src/assets.js';

import {SSBFighterInteractive, SSBFighter} from './ssb_game.js';

assets.loadImages({
  base_path: './assets',
  apartment: 'backgrounds/apartment.jpg',
  school: 'backgrounds/school.jpg',
  battlefield: 'backgrounds/battlefield.jpg',
  coin: 'coin.png',
  knife: 'knife.png',
});

assets.loadAudio({
  base_path: './assets/audio/',
  happy: '335361__cabled-mess__little-happy-tune-22-10.wav',
  coin: '135936__bradwesson__collectcoin.wav',
});

export var Sonic = SSBFighter.from_obj({
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
Sonic.level = 1;

export var Me = new Player('Me', 'green');
export var me = Me.renderer;

export var Ness = SSBFighterInteractive.from_obj({
  constructor_args: ['Ness', 'red'],
  assets: {
    images: {
      base_path: './assets',
      heroSprite: 'ness.png',
      enemySprite: 'ness.png',
    },
  },
});
Ness.level = 1;
Me.party.push(Ness);
window.Ness = Ness;

export var game = new Game(Me);
