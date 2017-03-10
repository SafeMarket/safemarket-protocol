const Q = require('q')
const accounts = require('./accounts')
const Amorph = require('amorph')
const random = require('random-amorph')
const storePromise = require('./store')
const utils = require('../')
const filestorePromise = require('./filestore')
const ultralightbeam = require('./ultralightbeam')
const orderRegPromise = require('./orderReg')
const keccak256 = require('keccak256-amorph')
const storeRegPromise = require('./storeReg')
const orderParams = require('./orderParams')

const deferred = Q.defer()

module.exports = deferred.promise

describe('order', () => {

  const storeAlias = new Amorph('mystore', 'ascii')
  const zero = new Amorph(0, 'number')
  const payoutAddress = random(20)

  let storeReg
  let orderReg
  let filestore

  let storeMetaHash
  let marshalledStoreMeta
  let unmarshalledStoreMeta
  let marshalledOrderMeta
  let unmarshalledOrderMeta
  let encapsulatedOrderMeta
  let encapsulatedMessage1
  let encapsulatedMessage2
  let linkedStoreAddress
  let linkedAffiliateAddress
  let storeCurrencyPrice
  let prebufferCURR
  let value
  let affiliateFeeMicroperun
  let storePrefund
  let affiliatePayout
  let estimatedStorePayout

  let orderKey
  let orderId
  let order

  before(() => {
    return storePromise
  })

  before(() => {
    return storeRegPromise.then((_storeReg) => {
      storeReg = _storeReg
    })
  })

  before(() => {
    return orderRegPromise.then((_orderReg) => {
      orderReg = _orderReg
    })
  })

  before(() => {
    return filestorePromise.then((_filestore) => {
      filestore = _filestore
    })
  })

  describe('constants', () => {
    it('should get storePrefund', () => {
      return orderReg.fetch('storePrefund()', []).then((_storePrefund) => {
        storePrefund = _storePrefund
      })
    })
    it('should get affiliateFeeMicroperun', () => {
      return orderReg.fetch('affiliateFeeMicroperun()', []).then((_affiliateFeeMicroperun) => {
        affiliateFeeMicroperun = _affiliateFeeMicroperun
      })
    })
  })

  describe('buyer', () => {
    it('should get store meta', () => {
      return storeReg.fetch('stores(bytes32)', [storeAlias]).then((store) => {
        storeMetaHash = store.metaHash
        return filestore.fetch('files(bytes32)', [store.metaHash]).then((_marshalledStoreMeta) => {
          marshalledStoreMeta = _marshalledStoreMeta
          unmarshalledStoreMeta = utils.unmarshalStoreMeta(marshalledStoreMeta)
        })
      })
    })

    it('should derive orderKey', () => {
      orderKey = utils.deriveBilateralKey(accounts.default.privateKey, unmarshalledStoreMeta.publicKey)
    })

    it('should derive orderId', () => {
      orderId = keccak256(orderKey)
    })

    it('should compute store linkedAddress', () => {
      linkedStoreAddress = utils.deriveLinkedAddress(orderKey, unmarshalledStoreMeta.publicKey)
    })

    it('should compute affiliate linkedAddress', () => {
      const bilateralKey = utils.deriveBilateralKey(accounts.default.privateKey, accounts.affiliate.compressedPublicKey)
      linkedAffiliateAddress = utils.deriveLinkedAddress(
        bilateralKey,
        unmarshalledStoreMeta.publicKey
      )
    })

    it('should create an order meta', () => {
      orderParams.storeMetaHash = storeMetaHash
      marshalledOrderMeta = utils.marshalOrderMeta(orderParams)
    })

    it('should encrypt/encapsulate orderMeta', () => {
      const iv = random(16)
      const encryptedOrderMeta = utils.encrypt(marshalledOrderMeta, orderKey, iv)
      encapsulatedOrderMeta = utils.encapsulate(encryptedOrderMeta, iv)
    })

    it('should calculate prebufferCURR', () => {
      prebufferCURR = utils.calculatePrebufferCURR(unmarshalledStoreMeta, orderParams)
      prebufferCURR.should.not.amorphEqual(zero)
    })

    it('should get store currency price', () => {
      return orderReg.fetch('prices(bytes4)', [unmarshalledStoreMeta.currency]).then((_storeCurrencyPrice) => {
        storeCurrencyPrice = _storeCurrencyPrice
        storeCurrencyPrice.should.not.amorphEqual(zero)
      })
    })

    it('should calculate value', () => {
      value = prebufferCURR.as('bignumber', (bignumber) => {
        return bignumber.times(storeCurrencyPrice.to('bignumber'))
      })
    })

    it('should calculate affiliate payout', () => {
      affiliatePayout = value.as('bignumber', (bignumber) => {
        return bignumber.times(affiliateFeeMicroperun.to('bignumber')).div('1000000')
      })
    })

    it('should estimate store payout', () => {
      estimatedStorePayout = value.as('bignumber', (bignumber) => {
        return bignumber.minus(affiliatePayout.to('bignumber'))
      })
    })

    it('should create an order on the order reg', () => {
      return orderReg.broadcast('create(bytes32,bytes32,address,address,bytes4,uint256,bytes)', [
        orderId,
        utils.stripCompressedPublicKey(accounts.default.compressedPublicKey),
        linkedStoreAddress,
        linkedAffiliateAddress,
        unmarshalledStoreMeta.currency,
        prebufferCURR,
        encapsulatedOrderMeta
      ], {
        value: value.as('bignumber', (bignumber) => {
          return bignumber.plus(storePrefund.to('bignumber'))
        })
      }).getConfirmation()
    })
  })

  describe('store', () => {
    it('should be able to fetch order by id', () => {
      return orderReg.fetch('orders(bytes32)', [orderId]).then((_order) => {
        order = _order
      })
    })
    it('should have correct values', () => {
      order.status.to('number').should.equal(0)
      order.buyerStrippedPublicKey.should.amorphEqual(utils.stripCompressedPublicKey(accounts.default.compressedPublicKey))
      order.createdAt.should.amorphEqual(ultralightbeam.blockPoller.block.timestamp)
      order.shippedAt.should.amorphEqual(zero)
      order.buyer.should.amorphEqual(accounts.default.address)
      order.store.should.amorphEqual(linkedStoreAddress)
      order.affiliate.should.amorphEqual(linkedAffiliateAddress)
      // order.currency.should.amorphEqual(unmarshalledStoreMeta.currency)
      order.prebufferCURR.should.amorphEqual(prebufferCURR)
      order.value.should.amorphEqual(value)
      order.encapsulatedMetaHash.should.amorphEqual(keccak256(encapsulatedOrderMeta))
    })
    it('should be able to get order key', () => {
      const buyerPublicKey = utils.unstripCompressedPublicKey(order.buyerStrippedPublicKey)
      utils.deriveBilateralKey(accounts.store.privateKey, buyerPublicKey).should.amorphEqual(orderKey)
    })
    it('should be able to derive correct account', () => {
      accounts.store.deriveLinkedAccount(orderKey).address.should.amorphEqual(order.store)
    })
    it('store address should be funded', () => {
      return ultralightbeam.eth.getBalance(order.store).should.eventually.amorphEqual(storePrefund)
    })
    it('should be able to fetch encapsulatedOrderMeta', () => {
      filestore.fetch('files(bytes32)', [order.encapsulatedMetaHash]).then((_encapsulatedOrderMeta) => {
        _encapsulatedOrderMeta.should.amorphEqual(encapsulatedOrderMeta)
      })
    })
    it('should be able to unencapsulate/decrypt/unmarshal encapsulatedOrderMeta', () => {
      const unencapsulatedOrderMeta = utils.unencapsulate(encapsulatedOrderMeta)
      utils.decrypt(unencapsulatedOrderMeta.ciphertext, orderKey, unencapsulatedOrderMeta.iv).should.amorphEqual(marshalledOrderMeta)
      unmarshalledOrderMeta = utils.unmarshalOrderMeta(marshalledOrderMeta)
    })
    it('unmarshalled order meta should have correct values', () => {
      const keys = Object.keys(orderParams)
      unmarshalledOrderMeta.should.have.keys(keys)
      keys.forEach((key) => {
        if (orderParams[key] instanceof Array) {
          return
        }
        return unmarshalledOrderMeta[key].should.amorphEqual(orderParams[key])
      })
      unmarshalledOrderMeta.products.should.have.length(orderParams.products.length)
      unmarshalledOrderMeta.products.forEach((product, index) => {
        const productKeys = Object.keys(orderParams.products[index])
        product.should.have.keys(productKeys)
        productKeys.forEach((key) => {
          product[key].should.amorphEqual(orderParams.products[index][key])
        })
      })
    })
    it('should have correct store meta hash', () => {
      unmarshalledOrderMeta.storeMetaHash.should.amorphEqual(storeMetaHash)
    })
    it('should have correct prebufferCURR', () => {
      order.prebufferCURR.should.amorphEqual(utils.calculatePrebufferCURR(unmarshalledStoreMeta, unmarshalledOrderMeta))
    })
    // todo: make sure enough funds + buffer
    it('should mark as shipped', () => {
      return orderReg.broadcast('markAsShipped(bytes32,address)', [orderId, payoutAddress], {
        from: accounts.store.deriveLinkedAccount(orderKey)
      }).getConfirmation()
    })
    it('should be able to fetch order by id', () => {
      return orderReg.fetch('orders(bytes32)', [orderId]).then((_order) => {
        order = _order
      })
    })
    it('order should have correct values', () => {
      order.status.to('number').should.equal(2)
      order.shippedAt.should.amorphEqual(ultralightbeam.blockPoller.block.timestamp)
    })
    it('affiliate payout should be correct', () => {
      return ultralightbeam.eth.getBalance(linkedAffiliateAddress).should.eventually.amorphEqual(affiliatePayout)
    })
    it('payout address should have correct balance (within 5%)', () => {
      return ultralightbeam.eth.getBalance(payoutAddress).then((storePayout) => {
        storePayout.to('bignumber').div(estimatedStorePayout.to('bignumber')).toNumber().should.be.within(0.95, 1)
      })
    })
    it('linked store address should have zero', () => {
      return ultralightbeam.eth.getBalance(linkedStoreAddress).should.eventually.equal(zero)
    })
    it('should add an new message')
  })
})
