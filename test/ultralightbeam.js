const Ultralightbeam = require('ultralightbeam')
const provider = require('./provider')
const accounts = require('./accounts')
const Q = require('q')
const BigNumber = require('bignumber.js')
const Amorph = require('../modules/Amorph')

const gasLimit = 4000000

const ultralightbeam = new Ultralightbeam(provider, {
  blockPollerInterval: 500,
  maxBlocksToWait: 10,
  transactionHook: (transactionRequest) => {
    if (!transactionRequest.values.from) {
      transactionRequest.set('from', accounts.default)
    }

    const gasPricePromise = ultralightbeam.blockPoller.gasPrice ?
      Q.resolve(ultralightbeam.blockPoller.gasPrice)
      : ultralightbeam.blockPoller.gasPricePromise

    return Q.all([
      ultralightbeam.eth.getTransactionCount(transactionRequest.values.from.address),
      ultralightbeam.eth.estimateGas(transactionRequest),
      ultralightbeam.eth.getBalance(transactionRequest.values.from.address),
      gasPricePromise
    ]).then((results) => {
      const nonce = results[0]
      const gas = results[1]
      const balance = results[2]
      const gasPrice = results[3]

      transactionRequest.set('nonce', nonce)

      if (gas.to('bignumber').gt(gasLimit)) {
        return Q.reject(new Error('Exceeds block limit'))
      }
      const gasCost = gas.as('bignumber', (bignumber) => {
        return bignumber.times(gasPrice.to('bignumber'))
      })
      console.log('gasCost:', gasCost.to('number'))
      console.log('balance:', balance.to('number'))
      if (gasCost.to('bignumber').gt(balance.to('bignumber'))) {
        console.log('gas cost:', gasCost.to('number'))
        console.log('balance:', balance.to('number'))
        return Q.reject(new Error('Exceeds available balance '))
      }

      const multipliedGas = gas.as('bignumber', (_bignumber) => {
        let bignumber = _bignumber.times(1.2).floor()
        if (bignumber.gt(gasLimit)) {
          bignumber = new BigNumber(gasLimit)
        }
        if (bignumber.times(gasPrice.to('bignumber')).gt(balance.to('bignumber'))) {
          bignumber = balance.to('bignumber')
        }
        return bignumber
      })

      transactionRequest.set('gas', multipliedGas)

      return transactionRequest
    })
  }
})

module.exports = ultralightbeam
