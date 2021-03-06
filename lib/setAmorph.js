const amorphBufferPlugin = require('amorph-buffer')
const amorphBnPlugin = require('amorph-bn')
const _setAmorph = require('ultralightbeam/lib/setAmorph')

module.exports = function setAmorph(Amorph) {

  Amorph.loadPlugin(amorphBufferPlugin)
  Amorph.loadPlugin(amorphBnPlugin)

  _setAmorph(Amorph)

  Amorph.crossConverter.addPath(['number.string', 'bignumber', 'hex', 'hex.prefixed'])
  Amorph.crossConverter.addPath(['web3.bytes', 'hex.prefixed', 'hex', 'array'])
  Amorph.crossConverter.addPath(['web3.bytes', 'hex.prefixed', 'hex', 'array', 'uint8Array'])
  Amorph.crossConverter.addPath(['array', 'hex', 'hex.prefixed', 'web3.bytes'])
  Amorph.crossConverter.addPath(['buffer', 'hex', 'bignumber'])
  Amorph.crossConverter.addPath(['bignumber', 'hex', 'array'])
  Amorph.crossConverter.addPath(['array', 'hex', 'bignumber'])
  Amorph.crossConverter.addPath(['array', 'hex', 'bignumber', 'number'])
  Amorph.crossConverter.addPath(['buffer', 'hex', 'array'])
  Amorph.crossConverter.addPath(['hex', 'hex.prefixed', 'web3.bytes'])
  Amorph.crossConverter.addPath(['web3.bytes', 'hex.prefixed', 'hex', 'buffer'])
  Amorph.crossConverter.addPath(['ascii', 'buffer', 'uint8Array'])
  Amorph.crossConverter.addPath(['number', 'bignumber', 'hex', 'array', 'uint8Array'])
  Amorph.crossConverter.addPath(['base58', 'buffer', 'hex', 'array', 'uint8Array'])
  Amorph.crossConverter.addPath(['number.string', 'bignumber', 'hex', 'array', 'uint8Array'])
  Amorph.crossConverter.addPath(['uint8Array', 'array', 'hex', 'hex.prefixed', 'web3.bytes'])
  Amorph.crossConverter.addPath(['number.string', 'bignumber', 'web3.uint'])
  Amorph.crossConverter.addPath(['buffer', 'hex', 'hex.prefixed', 'web3.address'])
  Amorph.crossConverter.addPath(['buffer', 'hex', 'bignumber', 'web3.uint'])
  Amorph.crossConverter.addPath(['hex.prefixed', 'hex', 'bignumber', 'web3.uint'])
  Amorph.crossConverter.addPath(['uint8Array', 'array', 'hex', 'bignumber', 'web3.uint'])
  Amorph.crossConverter.addPath(['uint8Array', 'array', 'hex', 'bn'])
  Amorph.crossConverter.addPath(['uint8Array', 'array', 'hex', 'bignumber'])
  Amorph.crossConverter.addPath(['array', 'hex', 'hex.prefixed', 'web3.address'])
  Amorph.crossConverter.addPath(['buffer', 'hex', 'bn'])
  Amorph.crossConverter.addPath(['bn', 'hex', 'buffer'])
  Amorph.crossConverter.addPath(['web3.address', 'hex.prefixed', 'hex', 'array', 'uint8Array'])
  Amorph.crossConverter.addPath(['web3.uint', 'bignumber', 'hex', 'hex.prefixed'])
  Amorph.crossConverter.addPath(['web3.uint', 'bignumber', 'hex', 'hex.prefixed'])
  Amorph.crossConverter.addPath(['uint8Array', 'array', 'hex', 'bignumber', 'number'])
  Amorph.crossConverter.addPath(['bn', 'hex', 'hex.prefixed'])
  Amorph.crossConverter.addPath(['ascii', 'buffer', 'hex', 'array'])

  Amorph.crossConverter.addConverter('boolean', 'number', (boolean) => {
    return boolean ? 1 : 0
  })

  Amorph.crossConverter.addPath(['boolean', 'number', 'bignumber', 'hex', 'array', 'uint8Array'])

  return Amorph

}
