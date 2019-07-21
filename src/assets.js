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

      function _gen_callback(audio, resolver) {
        var still_loading = function() {
          if(audio.readyState >= 3) {
            resolver();
            return false;
          }

          return true;
        }

        setTimeout(function run_loadeddata() {
          if (!still_loading()) {
            return;
          }
          setTimeout(run_loadeddata, 1000);
        }, 1000);
      }
      var loadeddata = _gen_callback(audio, resolver);

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

  async wait_for_load(parent_el) {
    if (arguments.length == 0)
      parent_el = document.body;

    var progress = document.createElement('progress');
    progress.max = this.waiters.length;
    progress.value = 0;
    progress.classList.add("loading-progress", "nes-progress", "is-success");
    if (parent_el)
      parent_el.append(progress);

    function sleep(duration) {
      var p = new Promise(r => {
        setTimeout(r, duration);
      });
      return p;
    }

    while(this.waiters.length) {
      await this.waiters.pop();
      progress.value += 1;
      if (parent_el)
        await sleep(100);
    }

    if (parent_el)
      progress.remove();
  }
}

export var assets = new Assets();
