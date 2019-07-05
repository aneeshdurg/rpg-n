export class ItemDescriptor {
  constructor() { }
  get name() {
    return this.constructor.name;
  }
}

export class WeaponDescriptor extends ItemDescriptor {
  constructor() { super(); }
}
export class PotionDescriptor extends ItemDescriptor { }

export class Sword extends WeaponDescriptor {
  constructor() { super(); }

  get attack() {
    return 42;
  }
}
