const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const _ = require('lodash')
const random = require('random-amorph')
const keccak256 = require('keccak256-amorph')

const deferred = Q.defer()
module.exports = deferred.promise


describe('Filestore', () => {

  let filestore
  let files
  let fileHashes
  let transactionReceipts

  before(() => {
    files = _.range(10).map((index) => {
      const fileLength = (index + 1) * 32
      return random(fileLength)
    })
    fileHashes = files.map((file) => {
      return keccak256(file)
    })
  })

  after(() => {
    deferred.resolve(filestore)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.Filestore.code, contracts.Filestore.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        filestore = new SolWrapper(
          ultralightbeam, contracts.Filestore.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should add files to filestore', () => {
    return Q.all(files.map((file) => {
      return filestore.broadcast('addFile(bytes)', [file]).getConfirmation()
    }))
  })

  it('should get files by filehash', () => {
    return Q.all(fileHashes.map((fileHash, index) => {
      const file = files[index]
      return filestore.fetch('files(bytes32)', [fileHash]).should.eventually.amorphEqual(file)
    }))
  })
})
