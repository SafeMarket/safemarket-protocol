const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const ipfsAmorphApi = require('./ipfsAmorphApi')
const _ = require('lodash')
const Amorph = require('../modules/Amorph')
const personas = require('./personas')
const crypto = require('crypto')
const planetoidUtils = require('planetoid-utils')
const ipfsUtils = require('ipfs-amorph-utils')

const deferred = Q.defer()
module.exports = deferred.promise

function random(length) {
  return new Amorph(crypto.randomBytes(length), 'buffer')
}

describe('planetoid', () => {

  let planetoid

  const tags = _.range(10).map(() => {
    return random(4)
  })
  const values = _.range(10).map(() => {
    return random(2).as('array', (array) => {
      return [0, 0, 0, 0, 0, 0].concat(array)
    })
  })
  const documentHashes = _.range(10).map(() => {
    return random(32)
  })

  const transactionReceipts = []
  const records = []
  const recordHashes = []
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

  it('should add documents to planetoid', () => {
    return Q.all(_.range(10).map((index) => {
      const tag = tags[index]
      const value = values[index]
      const documentHash = documentHashes[index]
      return planetoid.broadcast('addDocument(bytes4,bytes32)', [tag, documentHash], { value }).getTransactionReceipt()
    })).then((_transactionReceipts) => {
      transactionReceipts.push(..._transactionReceipts)
      return transactionReceipts.map((transactionReceipt) => {
        return planetoid.parseTransactionReceipt(transactionReceipt)[0].topics
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
      log.should.have.keys(['sender', 'tag', 'value', 'documentHash'])
      log.sender.should.amorphEqual(personas[0].address)
      log.tag.should.amorphEqual(tags[index])
      log.value.should.amorphEqual(values[index])
      log.documentHash.should.amorphEqual(documentHashes[index])
    })
  })

  it('should get timestmaps', () => {
    return Q.all(transactionReceipts.map((transactionReceipt) => {
      return ultralightbeam.eth.getBlockByHash(transactionReceipt.blockHash, false)
    })).then((blocks) => {
      return blocks.map((block) => {
        return block.timestamp
      })
    }).then((_timestamps) => {
      timestamps.push(..._timestamps)
    })
  })

  it('should add records to IPFS', () => {

    let previousRecordHash = new Amorph(Array(32).fill(0), 'array')
    const _records = _.range(10).map((index) => {
      const record = planetoidUtils.marshalRecord(
        timestamps[index],
        personas[0].address,
        personas[0].address,
        tags[index],
        values[index],
        documentHashes[index],
        previousRecordHash
      )
      previousRecordHash = ipfsUtils.stripSha2256Multihash(ipfsUtils.getUnixFileMultihash(record))
      recordHashes.push(previousRecordHash)
      return record
    })
    records.push(..._records)

    return Q.all(_records.map((record) => {
      return ipfsAmorphApi.addFile(record)
    }))
  })

  it('records should all be 120 bytes long', () => {
    records.forEach((record) => {
      record.to('array').should.have.length(120)
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
      return ipfsAmorphApi.getFile(ipfsUtils.unstripSha2256Hash(recordHash))
    })).then((_records) => {
      _records.forEach((record, index) => {

        record.should.amorphEqual(records[index])
        const unmarshalledRecord = planetoidUtils.unmarshalRecord(record)

        unmarshalledRecord.timestamp.should.amorphEqual(timestamps[index])
        unmarshalledRecord.origin.should.amorphEqual(personas[0].address)
        unmarshalledRecord.sender.should.amorphEqual(personas[0].address)
        unmarshalledRecord.tag.should.amorphEqual(tags[index])
        unmarshalledRecord.value.should.amorphEqual(values[index])
        unmarshalledRecord.documentHash.should.amorphEqual(documentHashes[index])
        if (index > 0) {
          unmarshalledRecord.previousRecordHash.should.amorphEqual(recordHashes[index - 1])
        } else {
          unmarshalledRecord.previousRecordHash.to('number').should.equal(0)
        }
      })
    })
  })
})
