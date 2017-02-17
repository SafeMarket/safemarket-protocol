const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const eccKeypairs = require('./eccKeypairs')
const safecommUtils = require('safecomm-utils')
const Amorph = require('amorph')
const personas = require('./personas')

const deferred = Q.defer()

module.exports = deferred.promise

describe('PublicKeyReg', () => {

  let publicKeyReg

  after(() => {
    deferred.resolve(publicKeyReg)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.PublicKeyReg.code, contracts.PublicKeyReg.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        publicKeyReg = new SolWrapper(
          ultralightbeam, contracts.PublicKeyReg.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('register public keys', () => {
    return Q.all(eccKeypairs.map((eccKeypair) => {
      return publicKeyReg.broadcast('register(bytes)', [eccKeypair.publicKeyCompressed], {
        gas: new Amorph(3000000, 'number')
      }).getConfirmation()
    }))
  })

  it('should have added public key', () => {
    return Q.all(eccKeypairs.map((eccKeypair) => {
      const hash = safecommUtils.hash(eccKeypair.publicKeyCompressed)
      return publicKeyReg.fetch('publicKeys(bytes32)', [hash]).then((publicKey) => {
        publicKey.owner.should.amorphEqual(personas[0].address)
        publicKey.publicKey.should.amorphEqual(eccKeypair.publicKeyCompressed)
      })
    }))
  })

  it('should have added public key', () => {
    return Q.all(eccKeypairs.map((eccKeypair) => {
      const hash = safecommUtils.hash(eccKeypair.publicKeyCompressed)
      return publicKeyReg.fetch('publicKeys(bytes32)', [hash]).then((publicKey) => {
        publicKey.owner.should.amorphEqual(personas[0].address)
        publicKey.publicKey.should.amorphEqual(eccKeypair.publicKeyCompressed)
        publicKey.isRevoked.to('boolean').should.equal(false)
      })
    }))
  })

  it('should NOT be able to revoke from a different persona', () => {
    return publicKeyReg.broadcast('setIsRevoked(bytes32,bool)', [
      safecommUtils.hash(eccKeypairs[0].publicKeyCompressed),
      new Amorph(true, 'boolean')
    ], {
      from: personas[1]
    }).getConfirmation().should.be.rejectedWith(Error)
  })

  it('should be able to revoke', () => {
    return publicKeyReg.broadcast('setIsRevoked(bytes32,bool)', [
      safecommUtils.hash(eccKeypairs[0].publicKeyCompressed),
      new Amorph(true, 'boolean')
    ]).getConfirmation().then(() => {
      return publicKeyReg.fetch('publicKeys(bytes32)', [
        safecommUtils.hash(eccKeypairs[0].publicKeyCompressed)
      ]).then((publicKey) => {
        publicKey.isRevoked.to('boolean').should.equal(true)
      })
    })
  })

})
