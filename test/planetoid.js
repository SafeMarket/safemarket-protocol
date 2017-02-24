const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const ipfsAmorphApi = require('./ipfsAmorphApi')
const _ = require('lodash')
const Amorph = require('../modules/Amorph')
const personas = require('./personas')

const deferred = Q.defer()
module.exports = deferred.promise

const documents = _.range(10).map(() => {
  return new Amorph(`document #${10}`, 'ascii')
})

describe('planetoid', () => {

  let planetoid
  const records = []
  const recordHashes = []
  const documentHashes = []
  const logs = []
  const timestamps = []

  after(() => {
    deferred.resolve(planetoid)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.Planetoid.code, contracts.Planetoid.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        planetoid = new SolWrapper(
          ultralightbeam, contracts.Planetoid.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should get recordsHash as 0', () => {
    return planetoid.fetch('recordHash()').should.eventually.amorphTo('number').equal(0)
  })

  it('should get recordsCount as 0', () => {
    return planetoid.fetch('recordsCount()').should.eventually.amorphTo('number').equal(0)
  })

  it('should add documents to IPFS', () => {
    return Q.all(documents.map((document) => {
      return ipfsAmorphApi.addFile(document)
    })).then((documentMultihashes) => {
      return documentMultihashes.map((documentMultihash) => {
        return documentMultihash.as('array', (array) => {
          return array.slice(2)
        })
      })
    }).then((_documentHashes) => {
      documentHashes.push(..._documentHashes)
    })
  })

  it('should add documents to planetoid', () => {
    return Q.all(documentHashes.map((documentHash) => {
      return planetoid.broadcast('addDocument(bytes32)', [documentHash]).getTransactionReceipt()
    })).then((transactionReceipts) => {
      return transactionReceipts.map((transactionReceipt) => {
        const log = planetoid.parseTransactionReceipt(transactionReceipt)[0].topics
        log.transactionReceipt = transactionReceipt
        return log
      })
    }).then((_logs) => {
      logs.push(..._logs)
    })
  })

  it('should get recordsCount of 10', () => {
    return planetoid.fetch('recordsCount()').should.eventually.amorphTo('number').equal(10)
  })

  it('should have correct logs', () => {
    logs.forEach((log, index) => {
      log.sender.should.amorphEqual(personas[0].address)
      log.documentHash.should.amorphEqual(documentHashes[index])
    })
  })

  it('should get timestmaps', () => {
    return Q.all(logs.map((log) => {
      return ultralightbeam.eth.getBlockByHash(log.transactionReceipt.blockHash, false)
    })).then((blocks) => {
      return blocks.map((block) => {
        return block.timestamp
      })
    }).then((_timestamps) => {
      timestamps.push(..._timestamps)
    })
  })

  it('should add records to IPFS', () => {

    function addRecord(index, _recordHash) {
      const log = logs[index]
      const timestamp = timestamps[index]
      const record = timestamp.as('array', (timestampArray) => {
        return timestampArray.concat(
          log.sender.to('array')
        ).concat(
          log.documentHash.to('array')
        ).concat(
          _recordHash.to('array')
        )
      })
      records.push(record)
      return ipfsAmorphApi.addFile(record).then((recordMultihash) => {
        const recordHash = recordMultihash.as('array', (array) => {
          return array.slice(2)
        })
        recordHashes.push(recordHash)
        const nextIndex = index + 1
        if (nextIndex < documents.length) {
          return addRecord(nextIndex, recordHash)
        }
      })
    }

    const zeroRecordHash = new Amorph(Array(32).fill(0), 'array')
    return addRecord(0, zeroRecordHash)
  })

  it('records should all be 88 bytes long', () => {
    records.forEach((record) => {
      record.to('array').should.have.length(88)
    })
  })

  it('record hashes should be correct', () => {
    recordHashes.forEach((recordHash, index) => {
      recordHash.should.amorphEqual(logs[index].recordHash)
    })
  })

  it('current record hash should NOT be 0', () => {
    return planetoid.fetch('recordHash()', []).should.eventually.amorphTo('number').not.equal(0)
  })

  it('current record hash should equal latest record hash', () => {
    return planetoid.fetch('recordHash()', []).should.eventually.amorphEqual(_.last(recordHashes), 'hex.prefixed')
  })

  it('should be able to crawl records down the chain', () => {
    return Q.all(recordHashes.map((recordHash) => {
      const recordMultihash = recordHash.as('array', (array) => {
        return [0x12, 32].concat(array)
      })
      return ipfsAmorphApi.getFile(recordMultihash)
    })).then((_records) => {
      _records.forEach((record, index) => {

        record.should.amorphEqual(records[index])

        const timestamp = record.as('array', (array) => {
          return array.slice(0, 4)
        })
        const sender = record.as('array', (array) => {
          return array.slice(4, 24)
        })
        const documentHash = record.as('array', (array) => {
          return array.slice(24, 56)
        })
        const prevRecordHash = record.as('array', (array) => {
          return array.slice(56, 88)
        })

        timestamp.should.amorphEqual(timestamps[index])
        sender.should.amorphEqual(personas[0].address)
        documentHash.should.amorphEqual(documentHashes[index])

        if (index > 0) {
          prevRecordHash.should.amorphEqual(recordHashes[index - 1])
        } else {
          prevRecordHash.to('number').should.equal(0)
        }
      })
    })
  })
})
