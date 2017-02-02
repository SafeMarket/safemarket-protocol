const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const Amorph = require('../modules/Amorph')
const schemas = require('../modules/schemas')
const MICRO = require('../modules/MICRO')

const deferred = Q.defer()

ultralightbeam.blockPoller.emitter.setMaxListeners(1000)

module.exports = deferred.promise

describe('ticker', () => {

  let ticker

  after(() => {
    deferred.resolve(ticker)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.Ticker.code, contracts.Ticker.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        ticker = new SolWrapper(
          ultralightbeam, contracts.Ticker.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should set prices', () => {
    return Q.all([
      ticker.broadcast('setPrice(bytes32,uint256)', [new Amorph('WEI', 'ascii'), new Amorph(1, 'number')]).getTransactionReceipt(),
      ticker.broadcast('setPrice(bytes32,uint256)', [new Amorph('USD', 'ascii'), new Amorph(10, 'number')]).getTransactionReceipt(),
      ticker.broadcast('setPrice(bytes32,uint256)', [new Amorph('EUR', 'ascii'), new Amorph(20, 'number')]).getTransactionReceipt()
    ])
  })

  it('should get correct prices', () => {
    return Q.all([
      ticker.fetch('prices(bytes32)', [new Amorph('WEI', 'ascii')]).should.eventually.amorphTo('number').equal(1),
      ticker.fetch('prices(bytes32)', [new Amorph('USD', 'ascii')]).should.eventually.amorphTo('number').equal(10),
      ticker.fetch('prices(bytes32)', [new Amorph('EUR', 'ascii')]).should.eventually.amorphTo('number').equal(20)
    ])
  })

  it('should convert EUR to USD', () => {
    return ticker.fetch('convert(uint256,bytes32,bytes32)', [
      new Amorph(1, 'number'),
      new Amorph('EUR', 'ascii'),
      new Amorph('USD', 'ascii')
    ]).should.eventually.amorphTo('number').equal(2)
  })

  it('should convert EUR to WEI', () => {
    return ticker.fetch('convert(uint256,bytes32,bytes32)', [
      new Amorph(1, 'number'),
      new Amorph('EUR', 'ascii'),
      new Amorph('WEI', 'ascii')
    ]).should.eventually.amorphTo('number').equal(20)
  })

})
