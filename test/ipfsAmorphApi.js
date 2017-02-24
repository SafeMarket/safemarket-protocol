const IpfsAmorphApi = require('ipfs-amorph-api')

module.exports = new IpfsAmorphApi({
  protocol: 'https',
  host: 'ipfs.infura.io',
  port: 5001
})
