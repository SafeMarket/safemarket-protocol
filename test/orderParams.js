const Amorph = require('amorph')

module.exports = {
  branch: 'v0',
  value: {
    storeMetaHash: new Amorph(new Array(32).fill(1), 'array'), // overwritten in tests
    info: new Amorph('123 Fake St, NYC, NY, 10009. Thanks!', 'ascii'),
    transportId: new Amorph([0], 'array'),
    products: [
      {
        id: new Amorph([0, 0], 'array'),
        quantity: new Amorph(1, 'number')
      },
      {
        id: new Amorph([0, 1], 'array'),
        quantity: new Amorph(2, 'number')
      }
    ]
  }
}
