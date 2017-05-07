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
    unmarshalledStoreMeta.branch.should.equal('v0')
    unmarshalledStoreMeta.value.should.have.keys(Object.keys(storeParams.value))
    unmarshalledStoreMeta.value.publicKey.should.amorphEqual(accounts.store.compressedPublicKey)
    unmarshalledStoreMeta.value.minProductsTotal.should.amorphEqual(storeParams.value.minProductsTotal)
    unmarshalledStoreMeta.value.priceSetter.should.amorphEqual(storeParams.value.priceSetter)
    unmarshalledStoreMeta.value.currency.should.amorphEqual(storeParams.value.currency)
    unmarshalledStoreMeta.value.bufferMicroperun.should.amorphEqual(storeParams.value.bufferMicroperun)
    unmarshalledStoreMeta.value.products.should.have.length(2)
    unmarshalledStoreMeta.value.products[0].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.value.products[0].name.should.amorphEqual(storeParams.value.products[0].name)
    unmarshalledStoreMeta.value.products[0].price.should.amorphEqual(storeParams.value.products[0].price)
    unmarshalledStoreMeta.value.products[0].imageMultihashes.should.have.length(3)
    unmarshalledStoreMeta.value.products[0].imageMultihashes[1].should.amorphEqual(storeParams.value.products[0].imageMultihashes[1])
    unmarshalledStoreMeta.value.products[1].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.value.products[1].name.should.amorphEqual(storeParams.value.products[1].name)
    unmarshalledStoreMeta.value.products[1].price.should.amorphEqual(storeParams.value.products[1].price)
    unmarshalledStoreMeta.value.products[1].imageMultihashes.should.have.length(0)
    unmarshalledStoreMeta.value.products[1].should.have.keys([
      'name',
      'price',
      'info',
      'imageMultihashes'
    ])
    unmarshalledStoreMeta.value.transports.should.have.length(2)
    unmarshalledStoreMeta.value.transports[0].should.have.keys([
      'name',
      'to',
      'price',
      'info'
    ])
    unmarshalledStoreMeta.value.transports[0].name.should.amorphEqual(storeParams.value.transports[0].name)
    unmarshalledStoreMeta.value.transports[0].price.should.amorphEqual(storeParams.value.transports[0].price)
    unmarshalledStoreMeta.value.transports[1].should.have.keys([
      'name',
      'to',
      'price',
      'info'
    ])
  })

})
