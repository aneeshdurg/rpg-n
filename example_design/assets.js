import * as Assets from '../src/assets.js';

const music = {
  'base_path': './assets/music',
  'happy': 'happy.ogg',
  'sad': 'sad.ogg'
}
Assets.loadMusic(music);

const backgrounds = {
  'base_path': "./assets/backgrounds",
  'school': 'school.png',
  'apartment': 'apartment.png',
  'wasteland': 'wasteland.jpg'
}
Assets.loadBackgrounds(backgrounds);

const characters = {
  'base_path': './assets/characters',
  'Sonic': {
    'base_path': 'sonic/',
    'left': 'left.png',
    'right': 'right.png',
    'icon': 'icon.png'
  },
  'Waluigi': {
    'base_path': 'waluigi/',
    'left': 'left.png',
    'right': 'right.png',
    'dead': 'dead.png',
  },
  'Wario': {
    'left': 'left.png',
  }
}
Assets.loadCharacters(characters);

const misc = {
  'base_path': './assets/misc',
  'SSBSticker': 'ssbsticker.png',
  'SSBOrb': 'ssborb.png',
  'knife': 'knife.png',
}
Assets.loadImages(misc);
