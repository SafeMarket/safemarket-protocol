const Ultralightbeam = require('ultralightbeam')
const provider = require('./provider')
const personas = require('./personas')
const Q = require('q')
const BigNumber = require('bignumber.js')
const Amorph = require('../modules/Amorph')

const gasLimit = 4000000

const ultralightbeam = new Ultralightbeam(provider, {
  blockPollerInterval: 1000,
  maxBlocksToWait: 10,
  transactionHook: (transactionRequest) => {
    if (ultralightbeam.gasPrice) {
      transactionRequest.set('gasPrice', ultralightbeam.gasPrice)
    }
    if (!transactionRequest.values.from) {
      transactionRequest.set('from', personas[0])
    }
    return ultralightbeam.eth.getTransactionCount(personas[0].address).then((nonce) => {
      transactionRequest.set('nonce', nonce)
      return ultralightbeam.eth.estimateGas(transactionRequest).then((gas) => {
        console.log('=============')
        console.log('gas', gas.to('number'))
        console.log('=============')
        if (gas.to('bignumber').gt(gasLimit)) {
          return Q.reject(new Error('Exceeds block limit'))
        }
        transactionRequest.set('gas', gas.as('bignumber', (bn) => {
          const _gas = bn.times(2).floor()
          if (_gas.gt(gasLimit)) {
            return new BigNumber(gasLimit)
          }
          return _gas
        }))
        return transactionRequest
      })
    })
  }
})

module.exports = ultralightbeam
