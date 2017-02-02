const contracts = require('../modules/contracts')
const Q = require('q')
const parseTransactionReceipt = require('../modules/parseTransactionReceipt')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const personas = require('./personas')
const Amorph = require('../modules/Amorph')

require('./OrderReg')

const deferred = Q.defer()

module.exports = deferred.promise

describe('God', () => {

  let god

  after(() => {
    deferred.resolve(god)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.God.code, contracts.God.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        god = new SolWrapper(
          ultralightbeam, contracts.God.abi, transactionReceipt.contractAddress
        )
      })
  })

  describe('registerCode', () => {
    it('should register Proxy', () => {
      return god.broadcast('registerCode(bytes)', [contracts.Proxy.code]).getTransactionReceipt()
    })
    it('should have correct hash map', () => {
      return god.fetch('codes(bytes32)', [contracts.Proxy.codeHash]).should.eventually.amorphEqual(
        contracts.Proxy.code, 'array'
      )
    })
    it('should register Simple', () => {
      return god.broadcast('registerCode(bytes)', [contracts.Simple.code]).getTransactionReceipt()
    })
    it('should have correct hash map', () => {
      return god.fetch('codes(bytes32)', [contracts.Simple.codeHash]).should.eventually.amorphEqual(
        contracts.Simple.code, 'array'
      )
    })
  })

  describe('create', () => {
    let parsed
    it('should reject unregistered codeHash', () => {
      return god.broadcast(
        'create(bytes32)', [contracts.Ticker.codeHash]
      ).getTransactionReceipt().should.be.rejectedWith(Error)
    })

    it('should create a Simple contract', () => {
      return god.broadcast('create(bytes32)', [contracts.Simple.codeHash]).getTransactionReceipt().then((transactionReceipt) => {
        parsed = parseTransactionReceipt(transactionReceipt)
      })
    })

    it('transaction receipt should have right sender', () => {
      parsed.sender.should.amorphEqual(personas[0].address, 'array')
    })

    it('transaction receipt should have right codeHash', () => {
      parsed.codeHash.should.amorphEqual(contracts.Simple.codeHash, 'array')
    })

    it('transaction receipt should have right contractAddress', () => {
      ultralightbeam.eth.getCode(
        parsed.contractAddress
      ).should.eventually.amorphEqual(contracts.Simple.runcode)
    })

    it('transaction receipt should have right contractAddress', () => {
      ultralightbeam.eth.getCode(
        parsed.contractAddress
      ).should.eventually.amorphEqual(contracts.Simple.runcode)
    })
  })

  describe('createAndExecute', () => {

    let parsed
    let simple

    const pseudoSimple = new SolWrapper(ultralightbeam, contracts.Simple.abi)

    const calldatas = [
      pseudoSimple.getCalldata('setValue1(uint256)', [new Amorph(1, 'number')]),
      pseudoSimple.getCalldata('setValue2(uint256)', [new Amorph(2, 'number')]),
      pseudoSimple.getCalldata('setValue3(uint256)', [new Amorph(3, 'number')])
    ]
    const lengths = calldatas.map((calldata) => {
      return new Amorph(calldata.to('array').length, 'number')
    })
    const calldatasConcated = new Amorph(
      calldatas[0].to('array').concat(calldatas[1].to('array')).concat(calldatas[2].to('array'))
    , 'array')

    it('should be fulfilled', () => {
      return god.broadcast('createAndExecute(bytes32,uint256[],bytes)', [
        contracts.Simple.codeHash,
        lengths,
        calldatasConcated
      ]).getTransactionReceipt().then((transactionReceipt) => {
        parsed = parseTransactionReceipt(transactionReceipt)
      })
    })

    it('transaction receipt should have right sender', () => {
      parsed.sender.should.amorphEqual(personas[0].address)
    })

    it('transaction receipt should have right codeHash', () => {
      parsed.codeHash.should.amorphEqual(contracts.Simple.codeHash)
    })

    it('transaction receipt should have right contractAddress', () => {
      return ultralightbeam.eth.getCode(
        parsed.contractAddress
      ).should.eventually.amorphEqual(contracts.Simple.runcode)
    })

    describe('Simple', () => {
      it('should set simple', () => {
        simple = new SolWrapper(ultralightbeam, contracts.Simple.abi, parsed.contractAddress)
      })
      it('should have value1 of 1', () => {
        simple.fetch('value1()').should.eventually.amorphTo('number').equal(1)
      })
      it('should have value2 of 2', () => {
        simple.fetch('value2()').should.eventually.amorphTo('number').equal(2)
      })
      it('should have value3 of 3', () => {
        simple.fetch('value3()').should.eventually.amorphTo('number').equal(3)
      })
    })
  })
})
