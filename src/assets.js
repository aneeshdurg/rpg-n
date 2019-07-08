//const music = {
//  'base_path': '/assets/music',
//  'happy': 'happy.ogg',
//  'sad': 'sad.ogg'
//}


export class Assets {
  constructor() {
    this.audio = new Map();
    this.images = new Map();
    this.waiters = [];
  }

  loadAudio(music) {
    var base_path = music.base_path || "";
    delete music.base_path;

    if (base_path.length && base_path.slice(-1) != "/") {
      base_path += "/";
    }

    var keys = Object.keys(music);
    for (var key of keys) {
      var audio = document.createElement('audio');
      var resolver = null;
      this.waiters.push(new Promise((r) => { resolver = r; }));

      var source = document.createElement('source');
      source.src = base_path + music[key];
      audio.appendChild(source);

      function _gen_callback(resolver) {
        return function() {
          if(audio.readyState >= 3) {
            resolver();
          }
        }
      }
      audio.addEventListener('loadeddata', _gen_callback(resolver));

      document.body.appendChild(audio);

      if (this.audio.get(key)) {
        throw new Error("Audio element '" + key + "' does not have a unique name!");
      }
      this.audio.set(key, audio);
    }
  }

  loadImages(images) {
    var base_path = images.base_path || "";
    delete images.base_path;

    if (base_path.length && base_path.slice(-1) != "/") {
      base_path += "/";
    }

    var keys = Object.keys(images);
    for (var key of keys) {
      var img = document.createElement('img');
      var resolver = null;
      this.waiters.push(new Promise((r) => { resolver = r; }));

      function _gen_callback(resolver) {
        return function() {
          resolver();
        }
      }
      img.addEventListener('load', _gen_callback(resolver));
      img.style.display = "none";
      img.src = base_path + images[key];
      document.body.appendChild(img);

      if (this.images.get(key)) {
        throw new Error("Image element '" + key + "' does not have a unique name!");
      }
      this.images.set(key, img);
    }
  }

  async wait_for_load() {
    while(this.waiters.length)
      await this.waiters.pop();
  }
}

export var assets = new Assets();

//const characters = {
//  'base_path': '/assets/characters',
//  'Sonic': {
//    'base_path': 'sonic/',
//    'left': 'left.png',
//    'right': 'right.png',
//    'icon': 'icon.png'
//  },
//  'Waluigi': {
//    'base_path': 'waluigi/',
//    'left': 'left.png',
//    'right': 'right.png',
//    'dead': 'dead.png',
//  },
//  'Wario': {
//    'left': 'left.png',
//  }
//}
function loadCharacters(characters) {}


