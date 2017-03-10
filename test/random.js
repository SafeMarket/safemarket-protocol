const Amorph = require('amorph')
const crypto = require('crypto')

module.exports = function random(length) {
  return new Amorph(crypto.randomBytes(length), 'buffer')
}
