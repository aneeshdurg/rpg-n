export class ItemDescriptor {
  constructor() { }
  get name() {
    return this.constructor.name;
  }
}

export class WeaponDescriptor extends ItemDescriptor { }
export class PotionDescriptor extends ItemDescriptor { }

// Example of how a WeaponDescriptor might look:
// export class Sword extends WeaponDescriptor {
//   get attack() {
//     return 42;
//   }
// }

export class Inventory extends Array {}

// A collection of named inventories
export class Backpack {}
