const contracts = require('../modules/contracts')
const Q = require('q')
const parseTransactionReceipt = require('../modules/parseTransactionReceipt')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const personas = require('./personas')
const Amorph = require('../modules/Amorph')
const storePromise = require('./store')
const schemas = require('../modules/schemas')
const MICRO = require('../modules/MICRO')
const tickerPromise = require('./ticker')
const _ = require('lodash')

const deferred = Q.defer()

module.exports = deferred.promise

describe('OrderReg', () => {

  let orderReg
  let store
  let ticker
  let STATUS

  after(() => {
    deferred.resolve(orderReg)
  })

  before(() => {
    return storePromise.then((_store) => {
      store = _store
    })
  })

  before(() => {
    return tickerPromise.then((_ticker) => {
      ticker = _ticker
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

  it('should get STATUS ids', () => {
    return orderReg.fetch('STATUS_IDS()', []).then((_STATUS) => {
      STATUS = _STATUS
    })
  })

  it('orderReg should set ticker', () => {
    return orderReg.broadcast('setTicker(address)', [ticker.address]).getTransactionReceipt()
  })

  it('store should add orderReg as owner', () => {
    return store.broadcast('setOwner(address,bool)', [orderReg.address, new Amorph(true, 'boolean')]).getTransactionReceipt()
  })

  it('should have 0 orders', () => {
    return getOrdersCount(orderReg).should.eventually.amorphTo('number').equal(0)
  })

  it('create an order for the store', () => {
    return createOrder(orderReg, store)
  })

  it('should have 1 orders', () => {
    return getOrdersCount(orderReg).should.eventually.amorphTo('number').equal(1)
  })

  describe('order', () => {
    let order
    it('should get 1st order', () => {
      return getOrder(orderReg, new Amorph(0, 'number')).then((_order) => {
        order = _order
      })
    })
    it('should have correct values', () => {
      order.status.should.amorphEqual(STATUS.PROCESSING)
      order.buyer.should.amorphEqual(personas[0].address, 'array')
      order.store.should.amorphEqual(store.address)
      order.arbitrator.to('number').should.equal(0)
      order.affiliate.to('number').should.equal(0)
      order.transportId.to('number').should.equal(1)

      order.productsCount.to('number').should.equal(2)

      order.currency.to('ascii').should.equal('USD')
      order.bufferMicroperun.to('bignumber').times(MICRO).toNumber().should.equal(0.5)
      order.affiliateFeeMicroperun.to('bignumber').times(MICRO).toNumber().should.equal(0.03)
      order.transportPrice.to('number').should.equal(50)

      order.receivedWEI.to('number').should.equal(1500)

      order.products[0].id.should.amorphTo('number').equal(0)
      order.products[0].price.should.amorphTo('number').equal(10)
      order.products[0].quantity.should.amorphTo('number').equal(2)

      order.products[1].id.should.amorphTo('number').equal(2)
      order.products[1].price.should.amorphTo('number').equal(30)
      order.products[1].quantity.should.amorphTo('number').equal(1)
    })
  })

  describe('cancellation', () => {
    describe('as buyer', () => {
      let orderId
      it('should create an order', () => {
        return createOrder(orderReg, store).then((_orderId) => {
          orderId = _orderId
        })
      })
      it('should be rejected from the wrong persona', () => {
        return orderReg.broadcast('setStatusAsCancelled(uint256)', [orderId], { from: personas[1] }).getTransaction().should.be.rejectedWith(Error)
      })
      it('status should be STATUS.PROCESSING', () => {
        return getOrder(orderReg, orderId).then((order) => {
          order.status.should.amorphEqual(STATUS.PROCESSING)
        })
      })
      it('should be allowed from buyer', () => {
        return orderReg.broadcast('setStatusAsCancelled(uint256)', [orderId], { from: personas[0] }).getTransaction()
      })
      it('status should be STATUS.CANCELLED', () => {
        return getOrder(orderReg, orderId).then((order) => {
          order.status.should.amorphEqual(STATUS.CANCELLED)
        })
      })
    })
  })
})

function createOrder(orderReg, store) {
  return getOrdersCount(orderReg).then((ordersCountBefore) => {
    return orderReg.broadcast(
      'create(address,address,address,uint256[],uint256[],uint256)',
      [
        store.address,
        new Amorph(0, 'number'),
        new Amorph(0, 'number'),
        [new Amorph(0, 'number'), new Amorph(2, 'number')],
        [new Amorph(2, 'number'), new Amorph(1, 'number')],
        new Amorph(1, 'number')
      ], {
        value: new Amorph(1500, 'number') // ((10USD*2)+(20USD*1)+(50USD))*1.5
      }
    ).getTransaction().then(() => {
      return getOrdersCount(orderReg).then((ordersCountAfter) => {
        if (ordersCountAfter.to('number') - ordersCountBefore.to('number') !== 1) {
          throw new Error('Order failed to create')
        }
        return ordersCountBefore
      })
    })
  })
}

function getOrdersCount(orderReg) {
  return orderReg.fetch('ordersCount()')
}

function getOrder(orderReg, id) {
  const order = {
    products: [],
    updates: []
  }
  return Q.all([
    orderReg.fetch('orders(uint256)', [id]),
    orderReg.fetch('ordersStoreInfo(uint256)', [id]),
    orderReg.fetch('ordersPayoutInfo(uint256)', [id]),
    orderReg.fetch('ordersCartInfo(uint256)', [id])
  ]).then((orders) => {
    orders.forEach((_order) => {
      _.merge(order, _order)
    })
    const productsLength = order.products.length = order.productsCount.to('number')
    const updatesLength = order.updates.length = order.updatesCount.to('number')
    const productFetches = _.range(productsLength).map((index) => {
      return orderReg.fetch('ordersProducts(uint256,uint256)', [id, new Amorph(index, 'number')]).then((product) => {
        order.products[index] = product
      })
    })
    const updateFetches = _.range(updatesLength).map((index) => {
      return orderReg.fetch('ordersUpdates(uint256,uint256)', [id, new Amorph(index, 'number')]).then((update) => {
        order.updates[index] = update
      })
    })
    return Q.all(productFetches.concat(updateFetches)).then(() => {
      return order
    })
  })
}
