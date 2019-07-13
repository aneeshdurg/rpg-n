import {Scene} from '/src/ui.js';

export function get_scene() {
  return new Scene({
    name: 'splashscreen',
    cleanup: true,
    contents: async function(game) {
      return [
        "Welcome to the rpg-n demo!",
        ui.jump('intro'),
      ]
    },
  });
}
