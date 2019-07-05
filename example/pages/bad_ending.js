function entry(game, sprite_stack, context) {
  NewScene(
    setBackground("school"),
    sprite_stack.push(
      Draw.draw(Sonic.left, Left)),
    Me("Sonic there's something I need to tell you."),
    s("What's up friend?"),
    Me("That's the thing. We're not friends."),
    sprite_stack.get(-1).slow_shake(),
    s("What do you mean?"),
    Me("I hate you."),
    "Then I turned around and left"
  ):
  ClearScene(1000);
  NewScene(
    "What is this saddness I feel in my heart?",
    "I feel like a terrible person.",
    "I have no choice but to cry myself to sleep every night from now on.",
  );
  return Jump(Scenes.credits);
}
