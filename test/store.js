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

describe('store', () => {

  let store

  after(() => {
    deferred.resolve(store)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.Proxy.code, contracts.Proxy.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        store = new SolWrapper(
          ultralightbeam, contracts.Proxy.abi, transactionReceipt.contractAddress
        )
      })
  })

  // describe('download', () => {
  //   it('should download', () => {
  //     return schemas.Store.download((method, args) => {
  //       return store.fetch(method, args)
  //     })
  //   })
  //   it('should have all the keys', () => {
  //     schemas.Store.state.should.have.keys(Object.keys(schemas.Store.schemas))
  //   })
  //   it('products/transports should have length of 0', () => {
  //     schemas.Store.state.products.should.have.length(0)
  //     schemas.Store.state.transports.should.have.length(0)
  //   })
  // })

  describe('upload', () => {
    it('should upload', () => {
      return schemas.Store.upload({
        isOpen: new Amorph(true, 'boolean'),
        currency: new Amorph('USD', 'ascii'),
        bufferMicroperun: new Amorph(MICRO.pow(-1).times(0.5), 'bignumber'),
        disputeSeconds: new Amorph(60, 'number'),
        minProductsTotal: new Amorph(50, 'number'),
        affiliateFeeMicroperun: new Amorph(
          MICRO.pow(-1).times(0.03), 'bignumber'
        ),
        metaMultihash: new Amorph('deadbeef', 'hex'),
        products: [
          {
            isArchived: new Amorph(false, 'boolean'),
            price: new Amorph(10, 'number'),
            quantity: new Amorph(100, 'number')
          },
          {
            isArchived: new Amorph(true, 'boolean'),
            price: new Amorph(20, 'number'),
            quantity: new Amorph(200, 'number'),
          },
          {
            isArchived: new Amorph(false, 'boolean'),
            price: new Amorph(30, 'number'),
            quantity: new Amorph(300, 'number')
          }
        ],
        transports: [
          {
            isArchived: new Amorph(true, 'boolean'),
            price: new Amorph(40, 'number')
          },
          {
            isArchived: new Amorph(false, 'boolean'),
            price: new Amorph(50, 'number')
          }
        ],
        approvedArbitrators: [new Amorph(1, 'number'), new Amorph(2, 'number')]
      }, (method, args) => {
        return store.broadcast(method, args).getTransactionReceipt()
      })
    })
    it('should download', () => {
      return schemas.Store.download((method, args) => {
        return store.fetch(method, args)
      })
    })
    it('should have correct state', () => {
      schemas.Store.state.isOpen.to('boolean').should.equal(true)
      schemas.Store.state.currency.to('ascii').should.equal('USD')
      schemas.Store.state.bufferMicroperun.to('bignumber').times(MICRO).toNumber().should.equal(.5)
      schemas.Store.state.disputeSeconds.to('number').should.equal(60)
      schemas.Store.state.minProductsTotal.to('number').should.equal(50)
      schemas.Store.state.affiliateFeeMicroperun.to('bignumber').times(MICRO).toNumber().should.equal(.03)
      schemas.Store.state.metaMultihash.to('hex').indexOf('deadbeef').should.equal(0)
      schemas.Store.state.products.should.have.length(3)
      schemas.Store.state.transports.should.have.length(2)
      schemas.Store.state.products[0].isArchived.to('boolean').should.equal(false)
      schemas.Store.state.products[0].price.to('number').should.equal(10)
      schemas.Store.state.products[0].quantity.to('number').should.equal(100)
      schemas.Store.state.products[1].isArchived.to('boolean').should.equal(true)
      schemas.Store.state.products[1].price.to('number').should.equal(20)
      schemas.Store.state.products[1].quantity.to('number').should.equal(200)
      schemas.Store.state.products[2].isArchived.to('boolean').should.equal(false)
      schemas.Store.state.products[2].price.to('number').should.equal(30)
      schemas.Store.state.products[2].quantity.to('number').should.equal(300)
      schemas.Store.state.transports[0].isArchived.to('boolean').should.equal(true)
      schemas.Store.state.transports[0].price.to('number').should.equal(40)
      schemas.Store.state.transports[1].isArchived.to('boolean').should.equal(false)
      schemas.Store.state.transports[1].price.to('number').should.equal(50)
      schemas.Store.state.approvedArbitrators.should.have.length(2)
      schemas.Store.state.approvedArbitrators[0].should.amorphTo('number').equal(1)
      schemas.Store.state.approvedArbitrators[1].should.amorphTo('number').equal(2)
    })

  })

})
