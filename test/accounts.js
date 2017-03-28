const Account = require('ethereum-account-amorph')

module.exports = {
  default: Account.generatePositive(),
  store: Account.generatePositive(),
  arbitrator: Account.generatePositive(),
  affiliate: Account.generatePositive(),
  tempStore: Account.generatePositive()
}
