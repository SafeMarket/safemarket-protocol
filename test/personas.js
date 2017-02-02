const _ = require('lodash')
const Persona = require('ultralightbeam/lib/Persona')

module.exports = _.range(10).map(() => {
  return new Persona()
})
