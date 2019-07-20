import * as Positions from '../../../src/positions.js';
import * as Combat from '../../../src/combat.js';

import {assets} from '../../../src/assets.js';
import {ui, Draw, Scene} from '../../../src/ui.js';
import {Action} from '../../../src/actions.js';
import {game, Me, me, Sonic, s} from '../setup.js';

export var happy_ending = new Scene ({
  name: 'happy_ending',
  cleanup: true,
  contents: async function (game) {
    return [
      "I went home and did nothing.",
      "Life was good.",
      ui.jump('credits'),
    ];
  },
});

export var bad_ending = new Scene ({
  name: 'bad_ending',
  cleanup: true,
  contents: async function (game) {
    return [
      ui.setBackground(assets.images.get('school')),
      ui.draw(Sonic.sprite, Positions.Left),
      me("Sonic there's something I need to tell you."),
      s("What's up friend?"),
      me("That's the thing. We're not friends."),
      Draw.animate(Sonic.sprite, "shake", {asynchronous: true, iterationCount: 'infinite', noCancel: true}),
      s("What do you mean?"),
      me("I hate you."),
      "Then I turned around and left",
      ui.clearScene(1000),
      "What is this saddness I feel in my heart?",
      "I feel like a terrible person.",
      "I have no choice but to cry myself to sleep every night from now on.",
      ui.jump('credits'),
    ];
  },
});

export var credits = new Scene ({
  name: 'credits',
  cleanup: true,
  contents: async function (game) {
    return [
      "Thanks for playing!",
    ];
  },
});
