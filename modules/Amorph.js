const Amorph = require('ultralightbeam/lib/Amorph')

Amorph.loadConverter('web3.bytes', 'ascii', (hexPrefixed) => {
  const array = Amorph.crossConverter.convert(hexPrefixed, 'hex.prefixed', 'array').filter((byte) => {
    return byte > 0
  })
  return Amorph.crossConverter.convert(array, 'array', 'ascii')
})

Amorph.ready()

module.exports = Amorph
