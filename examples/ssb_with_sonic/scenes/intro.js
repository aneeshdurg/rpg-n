import * as Positions from '../../../src/positions.js';
import * as Actions from '../../../src/actions.js';

import {AsynchronousAction, Action} from '../../../src/actions.js';
import {assets} from '../../../src/assets.js';
import {ui, Draw, Scene} from '../../../src/ui.js';
import {HistoryItem} from '../../../src/game.js';

import {game, Me, me, Sonic, s} from '../setup.js';
import {SSBOrb} from '../ssb_game.js';

export var entry = new Scene({
  name: 'intro',
  cleanup: true,
  contents: async function (game) {
    return [
      ui.setBackground(assets.images.get('school')),
      ui.draw(Sonic.get_image('silhouette'), Positions.Left, {height: "100%"}, 'lightSpeedIn'),
      s("What's up?"),
      "Who is that?",
      Draw.remove(Sonic.get_image('silhouette')),
      ui.draw(Sonic.sprite, Positions.Left, {height: "100%"}, 'fadeIn'),
      "Oh. It's sonic.",
      me("Hi Sonic."),
      s("Want to play super smash bros?"),
      "I want to leave, but I don't want to hurt Sonic's feelings...",
      ui.choice(
        ["Sorry, I've got things to do!", 'happy_ending'],
        ["(Tell Sonic how you really feel)", 'bad_ending'],
        ["Sure, sounds fun", Actions.NO_ACTION],
        ["I guess I have nothing better to do...", Actions.NO_ACTION]),
      ui.exec(function(game) {
        var last_choice = game.history.filter(h => h.type == HistoryItem.types.choice).slice(-1)[0];
        var was_rude = last_choice.choice_id == 3;
        if (was_rude) {
          game.flags.set('sonic_friends', -1);
          return ui.sequence(
            "I guess I have nothing better to do...",
            Actions.CLEAR_TEXTBOX,
            s("Uh...sure, let's go then."),
            ui.jump('play_smash'),
          );
        } else {
          game.flags.set('sonic_friends', 1);
          return ui.sequence(
            me("Sure, that sounds really fun!"),
            Actions.CLEAR_TEXTBOX,
            s("Awesome!"),
            Actions.CLEAR_TEXTBOX,
            ui.draw(assets.images.get('coin'), Positions.Center, {height: "50%"}, "zoomIn", {asynchronous: true}),
            s("Take this!"),
            Draw.remove(assets.images.get('coin'), "zoomOut", {noCancel: true}),
            ui.exec((game) => {
              var member = game.player.party[0];
              member.backpack.misc.push(new SSBOrb(member));
              return Actions.NO_ACTION;
            }),
            s("It's a super smash bros. sticker I found."),
            Actions.CLEAR_TEXTBOX,
            me("Thanks, this is really cool!"),
            s("Don't mention it!"),
            ui.jump('play_smash'),
          );
        }
      }),
    ];
  },
});
