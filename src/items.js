import * as Combat from './combat.js';

// todo describe things like equipment vs items differently
// create mechanisms for items to emulate attacks and return move descriptors
export class ItemDescriptor {
  constructor(owner, params) {
    params = params || {
      can_be_used_in_battle: true,
      can_be_used_in_overworld: false,
    };
    this.owner = owner;
    this.can_be_used_in_battle = params.battle;
    this.can_be_used_in_overworld = params.overworld;
  }

  get name() {
    return this.constructor.name;
  }

  // returns MoveResult
  use(game) { }
}

export class WeaponDescriptor extends ItemDescriptor { }
export class PotionDescriptor extends ItemDescriptor {
  constructor(owner, value, val_is_absolute) {
    // assert that owner is Combat.Character
    super(owner);

    this.value = value;
    this.val_is_absolute = Boolean(val_is_absolute);
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
