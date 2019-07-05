function run() {
  var s = Sonic;

  Scene(
    setBackground("school"),
    sprite_stack.push(
      Draw.animate_from_left(Image.silhouette(Sonic.left), Left)),
    S("What's up?"),
    "Who is that?",
    sprite_stack.pop().fade_away_quick(),
    sprite_stack.push(
      Draw.draw(Sonic.left, Left)),
    "Oh. It's sonic.",
    Me("Hi Sonic."),
    S("Want to play super smash bros?"),
    "I want to leave. But I don't want to hurt Sonic's feelings...",
    Choice(
      ["Sorry, I've got things to do!", Scenes.happy_ending],
      ["(Tell Sonic how you really feel)", Scenes.bad_ending],
      ["Sure, sounds fun", play_smash, false],
      ["I guess I have nothing better to do...", play_smash, true]
    )
  )
}

function play_smash(game, sprite_stack, context) {
  var was_rude = context.last_choice[2];
  if (was_rude) {
    game.player.increment_flag("sonic_suspicious");
    Scene (
      Me(context.last_choice[0]),
      s("Uh..sure, let's go then.")
    );
  } else {
    game.player.increment_flag("sonic_friends");
    Scene(
      Me("Sure, that sounds really fun!"),
      s("Awesome!"),
      s("Here, you should take this super smash bros sticker I got!"),
      sprite_stack.push(
        Draw.animate_zoom_in(Images.SSBSticker, Center)),
      Exec(() => {
        game.player.recieve_item(my_items.SSBSticker);
        game.player.level_up();
      }),
      WAIT_FOR_CLICK,
      sprite_stack.pop().dissappear(),
      Me("Thanks! This is really cool!"),
      s("Don't mention it. Let's go!"),
    );
  }
  ClearScene();
  Jump(Scenes.ssb);
}
