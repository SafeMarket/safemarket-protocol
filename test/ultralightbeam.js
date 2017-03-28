const Ultralightbeam = require('ultralightbeam')
const provider = require('./provider')
const accounts = require('./accounts')
const Q = require('q')
const BigNumber = require('bignumber.js')
const Amorph = require('../modules/Amorph')

const gasLimit = 4000000

const ultralightbeam = new Ultralightbeam(provider, {
  arguguard: {
    allowSynonymousConstructors: true
  },
  blockPollerInterval: 500,
  maxBlocksToWait: 10,
  defaultAccount: accounts.default,
  gasCostHook: (gasCost) => {
    console.log('gasCost:', gasCost.to('number'))
    return Q.resolve(gasCost)
  }
})

module.exports = ultralightbeam
