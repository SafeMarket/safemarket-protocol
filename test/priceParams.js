const Amorph = require('amorph')

module.exports = [
  {
    currency: new Amorph('WEI0', 'ascii'),
    price: new Amorph('1', 'number')
  },
  {
    currency: new Amorph('USD6', 'ascii'),
    price: new Amorph('100000000000', 'number.string')
  },
  {
    currency: new Amorph('EUR0', 'ascii'),
    price: new Amorph('100000000000', 'number.string')
  }
]
