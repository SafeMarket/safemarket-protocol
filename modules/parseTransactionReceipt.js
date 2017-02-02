/* eslint-disable prefer-template */

module.exports = function parseTransactionReciept(transactionReceipt) {
  return {
    sender: transactionReceipt.logs[0].topics[1].as('array', (array) => {
      return array.slice(-20)
    }),
    codeHash: transactionReceipt.logs[0].topics[2],
    contractAddress: transactionReceipt.logs[0].data.as('array', (array) => {
      return array.slice(-20)
    })
  }
}
