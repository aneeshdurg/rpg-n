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

    var canvas = document.createElement('canvas');
    canvas.className = "loading-progress";
    if (parent_el)
      parent_el.append(canvas);

    var ctx = canvas.getContext('2d');

    function draw_rect(color, x, y, width, height) {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.rect(x, y, width, height);
      ctx.fill();
    }
    var border_width = 2;

    var inner_width = 100;
    var outer_width = 100 + 2 * border_width;

    var inner_height = 20;
    var outer_height = 20 + 2 * border_width;

    var outer_x = (canvas.width / 2) - (outer_width / 2);
    var outer_y = (canvas.height / 2) - (outer_height / 2);

    var inner_x = outer_x + border_width;
    var inner_y = outer_y + border_width;

    draw_rect("black", outer_x, outer_y, outer_width, outer_height);
    draw_rect("white", inner_x, inner_y, inner_width, inner_height);

    var total_waiting = this.waiters.length;

    var that = this;
    function get_width() {
      return 100 * (total_waiting - that.waiters.length) / total_waiting;
    }

    function sleep(duration) {
      var p = new Promise(r => {
        setTimeout(r, duration);
      });
      return p;
    }

    while(this.waiters.length) {
      await this.waiters.pop();
      draw_rect("green", inner_x, inner_y, get_width(), inner_height);

      if (parent_el)
        await sleep(100);
    }

    if (parent_el)
      canvas.remove();
  }
}

export var assets = new Assets();
