export const NO_ACTION = new Symbol('NO_ACTION');
export const UNREACHABLE = new Symbol('UNREACHABLE');
export const WAIT_FOR_CLICK = new Symbol('WAIT_FOR_CLICK');

class Exec {
  constructor(callback) {
    this.callback = callback;
  }
}

class Character { }

function NewScene() {
  ClearScene();
  Scene.apply(this, arguments);
}

function Scene() {
  for (var action of arguments) {
    handle_action(action);
  }
}

function handle_action(action) {
  if (action == NO_ACTION)
    return;

  if (action == UNREACHABLE)
    throw new Error("Reached unreachable game point!");

  if (action == WAIT_FOR_CLICK) {
    await game.wait_for_click();
  }
}
