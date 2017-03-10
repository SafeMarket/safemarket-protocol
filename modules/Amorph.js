const Amorph = require('ultralightbeam/lib/Amorph')

Amorph.loadConverter('boolean', 'buffer', (boolean) => {
  return !boolean ? new Buffer([0x00]) : new Buffer([0x01])
})

Amorph.loadConverter('buffer', 'boolean', (buffer) => {
  return buffer[0] === 0x01
})

Amorph.ready()

module.exports = Amorph
