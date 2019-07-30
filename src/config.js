// This is where game-wide configuration logic goes
// e.g. things like setting the border of the textbox, text scrolling speed, etc
import './mousetrap/mousetrap.min.js';

export const config = {
  typespeed: 40,
}

class KeyLayer extends Array {}

class KeybindingManager {
  constructor() {
    this.layers = [new KeyLayer()]; // List of KeyLayers
    this.bindings = new Map(); // Maps key -> [callbacks from all layers]
  }

  get active_layer() {
    if (this.layers.length)
      return this.layers.slice(-1)[0];
  }

  push_layer(mask_previous) { // TODO mask_previous causes this layer to be "opaque", all previous callbacks are erased
    this.layers.push(new KeyLayer());
    return this.active_layer;
  }

  register(key, callback) {
    if (key.indexOf(' ') >= 0)
      throw new Error("Key sequences not allowed!");
    this.active_layer.push(key);
    var callbacks = this.bindings.get(key) || (() => {
      var list = [];
      this.bindings.set(key, list);
      return list;
    })();
    callbacks.push(callback);
    Mousetrap.bind(key, callback);
  }

  pop_layer() {
    for (let key of this.active_layer) {
      var callbacks = this.bindings.get(key);
      var fn = callbacks.pop();
      Mousetrap.unbind(key, fn);
      if (callbacks.length) {
        Mousetrap.bind(key, callbacks.slice(-1)[0]);
      }
    }

    this.layers.pop();
  }
}

export const keymanager = new KeybindingManager();
