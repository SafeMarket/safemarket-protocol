const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const accounts = require('./accounts')
const Amorph = require('../modules/Amorph')
const random = require('./random')
const planetoidPromise = require('./planetoid')
const defaultBalance = require('./defaultBalance')
const utils = require('../')
const priceParams = require('./priceParams')
const planetoidUtils = require('planetoid-utils')

const deferred = Q.defer()

module.exports = deferred.promise

describe('OrderReg', () => {

  const zero = new Amorph(0, 'number')
  const orderId = random(32)
  const currency = new Amorph('USD6', 'ascii')
  const prebufferCURR = random(32)
  const encapsulatedOrderMeta = random(128)
  const affiliate = random(20)
  const payoutAddress = random(20)

  let orderReg
  let planetoid
  const storePrefund = new Amorph('10000000000000000', 'number.string')
  const affiliateFeeMicroperun = new Amorph('50000', 'number.string')
  const value = storePrefund.as('bignumber', (bignumber) => {
    return bignumber.times(2)
  })

  after(() => {
    deferred.resolve(orderReg)
  })

  before(() => {
    return planetoidPromise.then((_planetoid) => {
      planetoid = _planetoid
    })
  })

  it('should create an orderReg', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.OrderReg.code, contracts.OrderReg.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        orderReg = new SolWrapper(
          ultralightbeam, contracts.OrderReg.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should set storePrefund', () => {
    return orderReg.broadcast('setStorePrefund(uint256)', [storePrefund]).getConfirmation()
  })

  it('should get storePrefund', () => {
    return orderReg.fetch('storePrefund()', []).should.eventually.amorphEqual(storePrefund)
  })

  it('should set affiliateFeeMicroperun', () => {
    return orderReg.broadcast('setAffiliateFeeMicroperun(uint256)', [affiliateFeeMicroperun]).getConfirmation()
  })

  it('should get affiliateFeeMicroperun', () => {
    return orderReg.fetch('affiliateFeeMicroperun()', []).should.eventually.amorphEqual(affiliateFeeMicroperun)
  })

  it('should set prices', () => {
    return Q.all(priceParams.map((param) => {
      return orderReg.broadcast('setPrice(bytes4,uint256)', [
        param.currency,
        param.price
      ]).getConfirmation()
    }))
  })

  it('should get prices', () => {
    return Q.all(priceParams.map((param) => {
      return orderReg.fetch('prices(bytes4)', [param.currency]).should.eventually.amorphEqual(param.price)
    }))
  })

  it('orderReg should set planetoid', () => {
    return orderReg.broadcast('setPlanetoid(address)', [planetoid.address]).getTransactionReceipt()
  })

  it('planetoid should be correct', () => {
    return orderReg.fetch('planetoid()').should.eventually.amorphEqual(planetoid.address)
  })

  it('create order', () => {
    return orderReg.broadcast(
      'create(bytes32,bytes32,address,address,bytes4,uint256,bytes)', [
        orderId,
        utils.stripCompressedPublicKey(accounts.default.compressedPublicKey),
        accounts.tempStore.address,
        affiliate,
        currency,
        prebufferCURR,
        encapsulatedOrderMeta
      ], { value: value.as('bignumber', (bignumber) => {
        return bignumber.plus(storePrefund.to('bignumber'))
      }) }
    ).getConfirmation()
  })

  it('order should have correct values', () => {
    return orderReg.fetch('orders(bytes32)', [orderId]).then((order) => {
      order.shippedAt.should.amorphEqual(zero)
      order.status.should.amorphEqual(zero)
      order.buyer.should.amorphEqual(accounts.default.address)
      order.store.should.amorphEqual(accounts.tempStore.address)
      order.affiliate.should.amorphEqual(affiliate)
      // order.currency.should.amorphEqual(currency)
      order.prebufferCURR.should.amorphEqual(prebufferCURR)
      order.value.should.amorphEqual(value)
      return planetoid.fetch('records(bytes32)', [order.encapsulatedMetaHash]).then((_record) => {
        const record = planetoidUtils.unmarshalRecord(_record)
        record.timestamp.should.amorphEqual(ultralightbeam.blockPoller.block.timestamp)
        return planetoid.fetch('documents(bytes32)', [record.documentHash]).should.eventually.amorphEqual(encapsulatedOrderMeta)
      })
    })
  })

  it('store should be prefunded', () => {
    return ultralightbeam.eth.getBalance(accounts.tempStore.address).then((balance) => {
      balance.to('bignumber').minus(defaultBalance.to('bignumber')).toNumber().should.equal(storePrefund.to('number'))
    })
  })

  it('should be able to mark as shipped', () => {
    return orderReg.broadcast('markAsShipped(bytes32,address)', [orderId, payoutAddress], {
      from: accounts.tempStore
    }).getConfirmation()
  })

  it('order should have correct values', () => {
    return orderReg.fetch('orders(bytes32)', [orderId]).then((order) => {
      order.shippedAt.should.amorphEqual(ultralightbeam.blockPoller.block.timestamp)
      order.status.to('number').should.equal(2)
    })
  })
})
