const Amorph = require('./Amorph')
const Account = require('ethereum-account-amorph')

module.exports = {
  default: Account.generatePositive(Amorph),
  store: Account.generatePositive(Amorph),
  arbitrator: Account.generatePositive(Amorph),
  affiliate: Account.generatePositive(Amorph),
  tempStore: Account.generatePositive(Amorph)
}
