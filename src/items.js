import * as Combat from './combat.js';

// todo describe things like equipment vs items differently
// create mechanisms for items to emulate attacks and return move descriptors
export class ItemDescriptor {
  constructor(owner) {
    this.owner = owner;
  }

  get name() {
    return this.constructor.name;
  }

  // returns MoveResult
  use(game) { }
}

export class WeaponDescriptor extends ItemDescriptor { }
export class PotionDescriptor extends ItemDescriptor {
  constructor(owner, name, value, val_is_absolute) {
    // TODO assert that owner is Combat.Character
    super(owner);

    this._name = name;
    this.value = value;
    this.val_is_absolute = Boolean(val_is_absolute);
  }

  get name() {
    return this._name;
  }

  use(game) {
    var healing = 0;
    if (this.val_is_absolute) {
      healing = this.value;
    } else {
      healing = this.owner.max_hp * this.value;
    }

    return new Combat.MoveResult(
      new Combat.Damage([], -1 * healing),
      new Combat.Damage([], 0),
      ["Healed " + healing + "hp!"],
    );
  }
}

// Example of how a WeaponDescriptor might look:
// export class Sword extends WeaponDescriptor {
//   get attack() {
//     return 42;
//   }
// }

export class Inventory extends Array {
  remove(idx) { return this.splice(idx, 1)[0]; }
}

// A collection of named inventories
export class Backpack {
  // TODO wrap Inventories to enforce type requirements/mutabilitiy requirements
  // e.g. keyitems where things can be added but not dropped
  constructor() {
    this.potions = new Inventory();
    this.weapons = new Inventory();
    this.equipment = new Inventory();
    this.misc = new Inventory();
  }
}

export class Wallet {
  constructor(amt) {
    this._balance = amt;
  }

  set balance(amt) {
    if ((this._balance + amt) < 0)
      throw new Error("Balance cannot be negative!");

    this._balance += amt;
  }

  get balance() { return this._balance; }

}
