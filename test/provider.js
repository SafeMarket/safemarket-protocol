const TestRPC = require('ethereumjs-testrpc')
const accounts = require('./accounts')
const _ = require('lodash')
const defaultBalance = require('./defaultBalance')

module.exports = TestRPC.provider({
  gasLimit: 4000000,
  blocktime: 2,
  accounts: _.map(accounts, (account) => {
    return {
      balance: defaultBalance.to('hex.prefixed'),
      secretKey: account.privateKey.to('hex.prefixed')
    }
  }),
  unlocked_accounts: _.map(accounts, (account) => { return account.address.to('hex.prefixed') }),
  locked: false
})
