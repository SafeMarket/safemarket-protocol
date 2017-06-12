process.on('uncaughtException', (err) => {
  console.log(err)
  throw err
})

const protocol = require('../')
const chai = require('./chai')

protocol.Amorph = require('./Amorph')
require('./store')
