const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const _ = require('lodash')
const random = require('random-amorph')
const accounts = require('./accounts')
const planetoidUtils = require('planetoid-utils')
const keccak256 = require('keccak256-amorph')

const deferred = Q.defer()
module.exports = deferred.promise


describe('Planetoid', () => {

  let planetoid
  const documents = _.range(10).map(() => {
    return random(Math.ceil(Math.random() * 256))
  })
  const values = _.range(10).map(() => {
    return random(6)
  })
  const records = []
  const timestamps = _.range(10)

  after(() => {
    deferred.resolve(planetoid)
  })

  it('should instantiate', () => {
    return ultralightbeam
      .solDeploy(contracts.Planetoid.code, contracts.Planetoid.abi, [], {}).then((_planetoid) => {
        planetoid = _planetoid
      })
  })

  it('should add documents to planetoid', () => {
    return Q.all(documents.map((document, index) => {
      return planetoid.broadcast('addDocument(bytes)', [document], {
        value: values[index]
      }).getConfirmation().then(() => {
        timestamps[index] = ultralightbeam.blockPoller.block.timestamp
      })
    }))
  })

  it('should download documents', () => {
    return planetoid.fetch('rootRecordHash()', []).then((rootRecordHash) => {
      return planetoidUtils.downloadRecords(rootRecordHash, (recordhash) => {
        return planetoid.fetch('records(bytes32)', [recordhash]).then((record) => {
          return record
        })
      }, (recordHash, record) => {
        records.push(record)
        return Q.resolve()
      })
    })
  })

  it('should have downloaded 10 records', () => {
    records.should.have.length(10)
  })

  it('each record/document should be correct', () => {
    return Q.all(records.map((record, _index) => {
      const index = 9 - _index
      const document = documents[index]
      record.timestamp.should.amorphEqual(timestamps[index])
      record.sender.should.amorphEqual(accounts.default.address)
      record.gigawei.should.amorphEqual(values[index].as('bignumber', (bignumber) => {
        return bignumber.div('1000000000').floor()
      }))
      record.documentLength.to('number').should.equal(document.to('array').length)
      record.documentHash.should.amorphEqual(keccak256(document))
      return planetoid.fetch('documents(bytes32)', [record.documentHash]).should.eventually.amorphEqual(document)
    }))
  })
})
