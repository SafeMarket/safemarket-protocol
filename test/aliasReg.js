const contracts = require('../modules/contracts')
const Q = require('q')
const parseTransactionReceipt = require('../modules/parseTransactionReceipt')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const personas = require('./personas')
const Amorph = require('../modules/Amorph')

require('./safecomm')

const deferred = Q.defer()

module.exports = deferred.promise

describe('AliasReg', () => {

  let aliasReg

  after(() => {
    deferred.resolve(aliasReg)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.AliasReg.code, contracts.AliasReg.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        aliasReg = new SolWrapper(
          ultralightbeam, contracts.AliasReg.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('cannot register a blank alias', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('', 'ascii')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with an uppercase letter', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myAlias', 'ascii')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with an space', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('my alias', 'ascii')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot register an alias with a middle 0x00', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('300030', 'hex')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('can register "myalias"', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myalias', 'ascii')]).getConfirmation()
  })

  it('can retreive owner associated with "myalias"', () => {
    return aliasReg.fetch('owners(bytes32)', [
      new Amorph('myalias', 'ascii')
    ]).should.eventually.amorphEqual(personas[0].address)
  })

  it('can retreive alias associated with personas[0]', () => {
    return aliasReg.fetch('aliases(address)', [
      personas[0].address
    ]).should.eventually.amorphTo('ascii').equal('myalias')
  })

  it('cannot claim "myalias" again', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myalias', 'ascii')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('cannot re-register "myalias" from personas[1]', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myalias', 'ascii')], {
      from: personas[1]
    }).getTransaction().should.be.rejectedWith(Error)
  })

  it('cannot register "myalias2"', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myalias2', 'ascii')]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('can retreive owner associated with "myalias"', () => {
    return aliasReg.fetch('owners(bytes32)', [
      new Amorph('myalias', 'ascii')
    ]).should.eventually.amorphEqual(personas[0].address)
  })

  it('can retreive alias associated with personas[0]', () => {
    return aliasReg.fetch('aliases(address)', [
      personas[0].address
    ]).should.eventually.amorphTo('ascii').equal('myalias')
  })

  it('can retreive owner associated with "myalias2"', () => {
    return aliasReg.fetch('owners(bytes32)', [
      new Amorph('myalias2', 'ascii')
    ]).should.eventually.amorphTo('number').equal(0)
  })

  it('can retreive alias associated with personas[1]', () => {
    return aliasReg.fetch('aliases(address)', [
      personas[1].address
    ]).should.eventually.amorphTo('ascii').equal('')
  })

  it('can unregister', () => {
    return aliasReg.broadcast('unregister()', []).getConfirmation()
  })

  it('can retreive owner associated with "myalias"', () => {
    return aliasReg.fetch('owners(bytes32)', [
      new Amorph('myalias', 'ascii')
    ]).should.eventually.amorphTo('number').equal(0)
  })

  it('can re-register "myalias" from personas[2]', () => {
    return aliasReg.broadcast('register(bytes32)', [new Amorph('myalias', 'ascii')], {
      from: personas[2]
    }).getTransaction()
  })

  it('can retreive owner associated with "myalias"', () => {
    return aliasReg.fetch('owners(bytes32)', [
      new Amorph('myalias', 'ascii')
    ]).should.eventually.amorphEqual(personas[2].address)
  })

  it('can retreive alias associated with personas[2]', () => {
    return aliasReg.fetch('aliases(address)', [
      personas[2].address
    ]).should.eventually.amorphTo('ascii').equal('myalias')
  })

})
