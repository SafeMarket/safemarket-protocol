const Amorph = require('./Amorph')
const _ = require('lodash')
const soliditySha3 = require('solidity-sha3')
const Q = require('q')

function Schema(schemas) {
  this.schemas = {}
  schemas.forEach((schema) => {
    this.schemas[schema.name] = schema
  })
}

Schema.prototype.upload = function upload(state, func) {
  const uploadPromises = _.map(state, (_state, name) => {
    return this.schemas[name].upload(_state, func)
  })
  return Q.all(uploadPromises)
}

Schema.prototype.download = function download(func) {
  const state = {}
  const promises = _.map(this.schemas, (schema) => {
    return schema.download(func).then(() => {
      state[schema.name] = schema.state
    })
  })
  return Q.all(promises).then(() => {
    this.state = state
  })
}

function StructArray(name, variables) {
  this.name = name
  this.variables = {}
  this.state = []
  variables.forEach((variable) => {
    variable.getKey = function getKey(index) {
      return new Amorph(soliditySha3.default(`${name}_${variable.name}`, index), 'hex.prefixed')
    }
    this.variables[variable.name] = variable
  })
}

StructArray.prototype.download = function download(func) {
  const countMethod = 'get_uint256(bytes32)'
  const countKey = new Amorph(`${this.name}_count`, 'ascii')
  const structArray = []
  return func(countMethod, [countKey]).then((count) => {
    const fetchStructPromises = _.range(count.to('number')).map((index) => {
      structArray.push({})
      const fetchValuePromises = _.map(this.variables, (variable) => {
        const valueMethod = `get_${variable.type}(bytes32)`
        return func(valueMethod, [variable.getKey(index)]).then((value) => {
          structArray[index][variable.name] = value
        })
      })
      return Q.all(fetchValuePromises)
    })
    return Q.all(fetchStructPromises)
  }).then(() => {
    this.state = structArray
  })
}

StructArray.prototype.upload = function upload(arrayState, func) {
  const promises = []

  if (arrayState.length !== this.state.length) {
    promises.push(func(
      'set_uint256(bytes32,uint256)',
      [
        new Amorph(`${this.name}_count`, 'ascii'),
        new Amorph(arrayState.length, 'number')
      ]
    ))
  }

  _.forEach(arrayState, (structState, index) => {
    _.forEach(structState, (variableState, name) => {
      if (index >= this.state.length || !this.state[index][name].equals(variableState)) {
        promises.push(func(
          `set_${this.variables[name].type}(bytes32,${this.variables[name].type})`,
          [this.variables[name].getKey(index), variableState]
        ))
      }
    })
  })

  return Q.all(promises)
}

function Variable(type, name) {
  this.type = type
  this.name = name
}

Variable.prototype.download = function download(func) {
  const method = `get_${this.type}(bytes32)`
  const key = new Amorph(this.name, 'ascii')
  return func(method, [key]).then((state) => {
    this.state = state
  })
}

Variable.prototype.upload = function upload(state, func) {
  if (this.state && this.state.equals(state)) {
    return Q.resolve()
  }
  return func(`set_${this.type}(bytes32,${this.type})`, [
    new Amorph(this.name, 'ascii'), state
  ])
}

function MappedArray(type, name) {
  this.type = type
  this.name = name
}

const Store = new Schema([
  new Variable('address', 'orderReg'),
  new Variable('bool', 'isOpen'),
  new Variable('bytes32', 'currency'),
  new Variable('uint256', 'bufferMicroperun'),
  new Variable('uint256', 'disputeSeconds'),
  new Variable('uint256', 'minProductsTotal'),
  new Variable('uint256', 'affiliateFeeMicroperun'),
  new Variable('bytes', 'metaMultihash'),
  new StructArray('products', [
    new Variable('bool', 'isArchived'),
    new Variable('uint256', 'price'),
    new Variable('uint256', 'quantity')
  ]),
  new StructArray('transports', [
    new Variable('bool', 'isArchived'),
    new Variable('uint256', 'price')
  ])
//  ,
//  new MappedArray('address', 'approvedArbitrator')
])

const Arbitrator = new Schema([
  new Variable('address', 'orderReg'),
  new Variable('bool', 'isOpen'),
  new Variable('bytes4', 'currency'),
  new Variable('uint256', 'feeBase'),
  new Variable('uint256', 'feeMicroperun'),
  new Variable('bytes', 'metaMultihash')
//  ,
//  new MappedArray('address', 'approvedStore')
])

module.exports = {
  Store,
  Arbitrator
}
