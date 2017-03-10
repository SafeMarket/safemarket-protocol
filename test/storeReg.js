const contracts = require('../modules/contracts')
const Q = require('q')
const parseTransactionReceipt = require('../modules/parseTransactionReceipt')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const accounts = require('./accounts')
const Amorph = require('../modules/Amorph')
const random = require('random-amorph')
const filestorePromise = require('./filestore')
const keccak256 = require('keccak256-amorph')

const deferred = Q.defer()

module.exports = deferred.promise

describe('StoreReg', () => {

  const meta = random(120)
  let filestore
  let storeReg
  let user

  before(() => {
    return filestorePromise.then((_filestore) => {
      filestore = _filestore
    })
  })

  after(() => {
    deferred.resolve(storeReg)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.StoreReg.code, contracts.StoreReg.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        storeReg = new SolWrapper(
          ultralightbeam, contracts.StoreReg.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should set filestore', () => {
    return storeReg.broadcast('setFilestore(address)', [filestore.address]).getConfirmation()
  })

  it('filestore should be correct', () => {
    return storeReg.fetch('filestore()').should.eventually.amorphEqual(filestore.address)
  })

  it('cannot register a blank alias', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('', 'ascii'), meta]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with an uppercase letter', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('myAlias', 'ascii'), meta]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with an space', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('my alias', 'ascii'), meta]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with a middle 0x00', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('300030', 'hex'), meta]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('can register "myalias"', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('myalias', 'ascii'), meta]).getConfirmation()
  })

  it('can NOT re-register "myalias"', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [new Amorph('myalias', 'ascii'), meta]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('can retreive user associated with "myalias"', () => {
    return storeReg.fetch('stores(bytes32)', [
      new Amorph('myalias', 'ascii')
    ]).then((_user) => {
      user = _user
    })
  })

  it('user should be correct', () => {
    user.owner.should.amorphEqual(accounts.default.address)
    user.metaHash.should.amorphEqual(keccak256(meta))
  })

})
