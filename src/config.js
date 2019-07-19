// This is where game-wide configuration logic goes
// e.g. things like setting the border of the textbox, text scrolling speed, etc


export class Config {
  constructor() {
    this.typespeed = 40;
  }
}

export var config = new Config();
