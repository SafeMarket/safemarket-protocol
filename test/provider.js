const TestRPC = require('ethereumjs-testrpc')
const personas = require('./personas')

module.exports = TestRPC.provider({
  gasLimit: 4000000,
  blocktime: 2,
  accounts: personas.map((persona) => {
    return {
      balance: 100000000000000000000000000,
      secretKey: persona.privateKey.to('hex.prefixed')
    }
  }),
  locked: false
})
