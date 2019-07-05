function entry(game, sprite_stack, context) {
  var s = Sonic;
  var w = Wario;
  var wl = Waluigi;

  NewScene(
    setBackground("apartment"),
    sprite_stack.push(
      Draw.animate_from_left(Sonic.left, Left)),
    sprite_stack.push(
      Draw.animate_from_right(Waluigi.right, Right)),
    s("Welcome to my apartment!"),
    s("These are my roommate, the Wario bros.!"),
    sprite_stack.pop_nth(-2).fade_away_quick(),
    sprite_stack.push(
      Draw.animate_from_left(Wario.left, Left)),
    w("sup").then(
      Text.right_align(wl("how's it hanging?"))),
    s("So " + game.player.name + ", Have you ever played smash before?"),
    Choice(
      ["yes", ssb],
      ["no", ssb_tutorial],
    )
  )
}

function ssb_tutorial(game, sprite_stack, context) {
  Scene(
    s("It's pretty easy to play!"),
    s("To start, you'll need to choose a fighter!"),
    s("Just click on any fighter you want!"),
    Exec(()=>{
      game.player.party.choose_main();
    }),
  );
}

function ssb_tutorial_fight(game, sprite_stack, context) {
  CombatScene(game.player.party.main.sprite, Sonic.sprite)(
    setBackground("wasteland"),
    s("Fighting is pretty easy!"),
    s("You can choose one of attack and inventory!"),
    "This feels more like pokemon than ssb...",
    "It's almost like this is an example of what a turn based example would be like...",
    "In theory, this could just be replaced with arbitrary javascript and we could implement" +
      " real ssb here.",
    Me("Sounds good."),
    RunGameUntil((game, player, enemy) => enemy.health < 50, {
      on_lose: ssb_tutorial_lost,
      on_victory: UNREACHABLE,
    }),
    s("NANI?!?!"),
    s.use_item('health_potion'), // this part of the interface makes no sense atm
    s("Let's see how you handle this!"),
    sprite_stack.push(
        Draw.animate_zoom_in(Images.SSBOrb, Center)),
    Exec(() => {
      // TODO figure out how to grant abilities to the party member instead of
      // the player
    }),
    WAIT_FOR_CLICK,
    sprite_stack.pop().dissappear(),
    s("oh."),
    Me("HAHAHAHAHA"),
    RunGame({
      on_lose: ssb_tutorial_lost,
      on_victory: NO_ACTION,
    }),
    s("Nice! Looks like you're ready for the real thing!"),
  )

  ClearScene();
  Jump(ssb);
}

function ssb_tutorial_lost() {
  Scene(
    setBackground("apartment"),
    sprite_stack.push(
      Draw.animate_from_left(Sonic.left, Left)),
    s("Don't worry about it!"),
    s("Do you want to try again? If you've got the hang of it we can just skip to the real thing."),
    Choice(
      ["yes", ssb_tutorial_fight],
      ["no", ssb],
    )
  )
}

function ssb() {
  Scene(
    setBackground("apartment"),
    sprite_stack.push(
      Draw.animate_from_left(Sonic.left, Left)),
    s("Let's play!"),
    Exec(()=>{
      game.player.party.choose_main();
    },
  );

  CombatScene(game.player.party.main.sprite, Sonic.sprite)(
    RunGame({
      on_lose: ssb_loss,
      on_victory: ssb_win,
    }),
  );
}

function ssb_loss() {
  Scene(
    s("HAHA you suck!"),
    "I feel a flash of rage overtake me",
    "I try to remain calm.",
  )

  if (game.player.get_flag('sonic_friends')) {
    Scene(
      "It's okay. It's just a game, and it was pretty fun.",
      Me("LOL, rematch me then n00b"),
      wl("Nope, it'sa waluigi time!"),
    );

    ClearScene(1000); // fade out in 1s

    NewScene("And so, we all lived happily ever after.")
    return Jump(Scenes.credits);
  }

  Scene(Me("I'm going home."));
  return Jump(Scenes.bad_ending);
}

function ssb_win() {
  Scene(Me("HAHA you suck!"));
  if(game.player.get_flag('sonic_suspicious')) {
    Scene(
      sprite_stack.get().crazy_shake, // somehow get the sonic sprite
      s("I'm going to kill you!!!"),
      sprite_stack.push(
        Draw.animate_zoom_in(Images.knife, Center)),
      WAIT_FOR_CLICK,
      sprite_stack.pop().remove(),
      wl("Noooo"),
      Draw.animate_from_below(Waluigi.dead, CenterDown)),
      "yikes",
    );
    return Jump(Scenes.credits);
  }

  Scene(
    s("Nice!"),
    s("Hey, Wario, you want to play next?"),
    w("Sure thing."),
    "This is more fun than I thought it would be!",
  )
  ClearScene(1000); // fade out in 1s

  NewScene("And so, we all lived happily ever after.")
  return Jump(Scenes.credits);
}
