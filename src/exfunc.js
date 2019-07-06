export default class ExFunc extends Function {
  constructor() {
    super('...args', 'return this.__call__(...args)');
    return this.bind(this);
  }

  __call__() {
    console.log(arguments);
  }
}


