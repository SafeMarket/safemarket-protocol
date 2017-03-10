const TestRPC = require('ethereumjs-testrpc')
const accounts = require('./accounts')
const _ = require('lodash')
const defaultBalance = require('./defaultBalance')

module.exports = TestRPC.provider({
  gasLimit: 4000000,
  blocktime: 1,
  accounts: _.map(accounts, (account) => {
    return {
      balance: defaultBalance.to('number'),
      secretKey: account.privateKey.to('hex.prefixed')
    }
  }),
  locked: false
})
