const EccKeypair = require('ecc-keypair')
const _ = require('lodash')
const safecommUtils = require('safecomm-utils')

module.exports = _.range(3).map(() => {
  const eccKeypair = EccKeypair.generate()
  eccKeypair.hash = safecommUtils.hash(eccKeypair.publicKeyCompressed)
  return eccKeypair
})
