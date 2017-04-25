const Q = require('q')
const utils = require('../')
const storeParams = require('./storeParams')
const accounts = require('./accounts')
const storeRegPromise = require('./storeReg')
const planetoidPromise = require('./planetoid')
const Amorph = require('amorph')
const planetoidUtils = require('planetoid-utils')

const deferred = Q.defer()

module.exports = deferred.promise

describe('Store', () => {

  const storeAlias = new Amorph('mystore', 'ascii')
  let storeReg
  let planetoid
  let marshalledStoreMeta
  let unmarshalledStoreMeta

  before(() => {
    return storeRegPromise.then((_storeReg) => {
      storeReg = _storeReg
    })
  })

  before(() => {
    return planetoidPromise.then((_planetoid) => {
      planetoid = _planetoid
    })
  })

  after(() => {
    deferred.resolve(marshalledStoreMeta)
  })

  it('should create marshal store meta', () => {
    marshalledStoreMeta = utils.marshalStoreMeta(storeParams)
  })

  it('should register on storeReg', () => {
    return storeReg.broadcast('register(bytes32,bytes)', [storeAlias, marshalledStoreMeta], {
      from: accounts.store
    }).getConfirmation()
  })

  it('should fetch marshalled store meta', () => {
    return storeReg.fetch('stores(bytes32)', [storeAlias]).then((store) => {
      return planetoid.fetch('records(bytes32)', [store.metaHash]).then((_record) => {
        const record = planetoidUtils.unmarshalRecord(_record)
        return planetoid.fetch('documents(bytes32)', [record.documentHash]).then((document) => {
          unmarshalledStoreMeta = utils.unmarshalStoreMeta(document)
        })
      })
    })
  })

  it('unmarshalledStoreMeta should have correct values', () => {
    unmarshalledStoreMeta.should.have.keys(Object.keys(storeParams))
    unmarshalledStoreMeta.version.to('number').should.equal(0)
    unmarshalledStoreMeta.publicKey.should.amorphEqual(accounts.store.compressedPublicKey)
    unmarshalledStoreMeta.minProductsTotal.should.amorphEqual(storeParams.minProductsTotal)
    unmarshalledStoreMeta.priceSetter.should.amorphEqual(storeParams.priceSetter)
    unmarshalledStoreMeta.currency.should.amorphEqual(storeParams.currency)
    unmarshalledStoreMeta.bufferMicroperun.should.amorphEqual(storeParams.bufferMicroperun)
    unmarshalledStoreMeta.products.should.have.length(2)
    unmarshalledStoreMeta.products[0].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.products[0].name.should.amorphEqual(storeParams.products[0].name)
    unmarshalledStoreMeta.products[0].price.should.amorphEqual(storeParams.products[0].price)
    unmarshalledStoreMeta.products[0].imageMultihashes.should.have.length(3)
    unmarshalledStoreMeta.products[0].imageMultihashes[1].should.amorphEqual(storeParams.products[0].imageMultihashes[1])
    unmarshalledStoreMeta.products[1].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.products[1].name.should.amorphEqual(storeParams.products[1].name)
    unmarshalledStoreMeta.products[1].price.should.amorphEqual(storeParams.products[1].price)
    unmarshalledStoreMeta.products[1].imageMultihashes.should.have.length(0)
    unmarshalledStoreMeta.products[1].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.transports.should.have.length(2)
    unmarshalledStoreMeta.transports[0].should.have.keys([
      'name',
      'to',
      'price',
      'info'
    ])
    unmarshalledStoreMeta.transports[0].name.should.amorphEqual(storeParams.transports[0].name)
    unmarshalledStoreMeta.transports[0].price.should.amorphEqual(storeParams.transports[0].price)
    unmarshalledStoreMeta.transports[1].should.have.keys([
      'name',
      'to',
      'price',
      'info'
    ])
  })

})
