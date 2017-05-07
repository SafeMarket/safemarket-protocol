const Amorph = require('../modules/Amorph')
const accounts = require('./accounts')

const currency = new Amorph('USD6', 'ascii')

module.exports = {
  branch: 'v0',
  value: {
    name: new Amorph('My Store', 'ascii'),
    publicKey: accounts.store.compressedPublicKey,
    isOpen: new Amorph(true, 'boolean'),
    base: new Amorph('us', 'ascii'),
    info: new Amorph('Info about my store', 'ascii'),
    priceSetter: accounts.default.address,
    currency: currency,
    minProductsTotal: new Amorph(10000000, 'number'),
    products: [{
      name: new Amorph('Chocolate chip cookies', 'ascii'),
      price: new Amorph(100000, 'number'),
      info: new Amorph('Ooey and gooey!', 'ascii'),
      imageMultihashes: [
        new Amorph('Qma', 'base58'),
        new Amorph('Qmb', 'base58'),
        new Amorph('Qmc', 'base58')
      ]
    },
    {
      name: new Amorph('Sugar cookies', 'ascii'),
      price: new Amorph(200000, 'number'),
      info: new Amorph('Sweet and fresh!', 'ascii'),
      imageMultihashes: []
    }],
    transports: [{
      name: new Amorph('Domestic', 'ascii'),
      to: new Amorph('us', 'ascii'),
      price: new Amorph(500000, 'number'),
      info: new Amorph('Home sweet home!', 'ascii')
    },
    {
      name: new Amorph('Global', 'ascii'),
      to: new Amorph([0, 0], 'array'),
      price: new Amorph(20000000, 'number'),
      info: new Amorph('To every corner of the globe!', 'ascii')
    }],
    contact: new Amorph('hello@satoshisbakery.com', 'ascii'),
    tagline: new Amorph('The best in the biz', 'ascii'),
    bufferMicroperun: new Amorph('50000', 'number.string')
  }
}
