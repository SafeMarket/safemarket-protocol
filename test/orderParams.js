const Amorph = require('amorph')

module.exports = {
  version: new Amorph('00', 'hex'),
  info: new Amorph('123 Fake St, NYC, NY, 10009. Thanks!', 'ascii'),
  transportId: new Amorph(0, 'number'),
  products: [
    {
      id: new Amorph(0, 'number'),
      quantity: new Amorph(1, 'number')
    },
    {
      id: new Amorph(1, 'number'),
      quantity: new Amorph(2, 'number')
    }
  ]
}
