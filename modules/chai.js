const chai = require('chai')
const chaiAmorph = require('chai-amorph')
const chaiWeb3Bindings = require('chai-web3-bindings')
const chaiAsPromised = require('chai-as-promised')
const chaiBignumber = require('chai-bignumber')
const Bignumber = require('bignumber.js')


chai.use(chaiAmorph)
chai.use(chaiWeb3Bindings)
chai.use(chaiAsPromised)
chai.use(chaiBignumber(Bignumber))
chai.should()
