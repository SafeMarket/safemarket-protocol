const contracts = require('../modules/contracts')
const Q = require('q')
const ultralightbeam = require('./ultralightbeam')
const SolDeployTranasctionRequest = require('ultralightbeam/lib/SolDeployTransactionRequest')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const personas = require('./personas')
const Amorph = require('amorph')
const safecommUtils = require('safecomm-utils')
const eccKeypairs = require('./eccKeypairs')

const deferred = Q.defer()

module.exports = deferred.promise

describe('Safecomm', () => {

  let safecomm
  let threadKey
  let threadKeyHash
  let thread
  let encapsulatedThreadKey01
  let encapsulatedThreadKey02
  const multiaddress = new Amorph('ipfs/Qm', 'ascii')

  after(() => {
    deferred.resolve(safecomm)
  })

  it('should instantiate', () => {
    const transactionRequest = new SolDeployTranasctionRequest(
      contracts.Safecomm.code, contracts.Safecomm.abi, []
    )
    return ultralightbeam
      .sendTransaction(transactionRequest)
      .getTransactionReceipt().then((transactionReceipt) => {
        safecomm = new SolWrapper(
          ultralightbeam, contracts.Safecomm.abi, transactionReceipt.contractAddress
        )
      })
  })

  it('should create a thread with participants 1 and 2', () => {
    threadKey = safecommUtils.random(16)
    threadKeyHash = safecommUtils.hash(threadKey)
    const bilateralKey = safecommUtils.getBilateralKey(
      eccKeypairs[0].privateKey, eccKeypairs[1].publicKeyCompressed
    )
    encapsulatedThreadKey01 = safecommUtils.encapsulate(threadKey, bilateralKey, false)
    return safecomm.broadcast('createThread(bytes32,address[],bytes32[3][])', [
      threadKeyHash,
      [personas[0].address, personas[1].address],
      [[
        safecommUtils.hash(eccKeypairs[0].publicKeyCompressed),
        safecommUtils.hash(eccKeypairs[1].publicKeyCompressed),
        encapsulatedThreadKey01
      ]]
    ]).getTransactionReceipt((transactionReceipt) => {
      safecomm.parseTransactionReceipt(
        transactionReceipt
      )[0].topics.threadKeyHash.should.amorphEqual(threadKeyHash)
    })
  })

  it('should get thread', () => {
    return safecomm.fetch('threads(bytes32)', [threadKeyHash]).then((_thread) => {
      thread = _thread
    })
  })

  it('thread should have correct counts', () => {
    thread.participantsCount.to('number').should.equal(2)
    thread.encapsulatedThreadKeysCount.to('number').should.equal(1)
    thread.descriptorsCount.to('number').should.equal(0)
  })

  it('thread should have correct participants', () => {
    return Q.all([0, 1].map((index) => {
      return safecomm.fetch('threadsParticipants(bytes32,uint256)', [
        threadKeyHash, new Amorph(index, 'number')
      ]).should.eventually.amorphEqual(personas[index].address)
    }))
  })

  it('thread should have correct encapsulatedThreadKey', () => {
    return safecomm.fetch('threadsEncapsulatedThreadKeys(bytes32,uint256)', [
      threadKeyHash, new Amorph(0, 'number')
    ]).then((_encapsulatedThreadKey) => {
      _encapsulatedThreadKey.encryptorPublicKeyHash.should.amorphEqual(eccKeypairs[0].hash)
      _encapsulatedThreadKey.encrypteePublicKeyHash.should.amorphEqual(eccKeypairs[1].hash)
      _encapsulatedThreadKey.encapsulatedThreadKey.should.amorphEqual(encapsulatedThreadKey01)
    })
  })

  it('thread non-participant should be NOT be able to add a new participant', () => {
    return safecomm.broadcast('addParticipant(bytes32,uint256,address)', [
      threadKeyHash, new Amorph(0, 'number'), personas[2].address
    ], { from: personas[3] }).getConfirmation().should.be.rejectedWith(Error)
  })

  it('thread participant should be NOT be able to add a new participant with wrong participantId', () => {
    return safecomm.broadcast('addParticipant(bytes32,uint256,address)', [
      threadKeyHash, new Amorph(1, 'number'), personas[2].address
    ]).getConfirmation().should.be.rejectedWith(Error)
  })

  it('should be be able to add a new participant', () => {
    return safecomm.broadcast('addParticipant(bytes32,uint256,address)', [
      threadKeyHash, new Amorph(0, 'number'), personas[2].address
    ]).getConfirmation()
  })

  it('should be be able to add a new encapsulatedThreadKeys', () => {
    const bilateralKey = safecommUtils.getBilateralKey(eccKeypairs[0].privateKey, eccKeypairs[1].publicKey)
    encapsulatedThreadKey02 = safecommUtils.encapsulate(bilateralKey, bilateralKey, false)
    return safecomm.broadcast('addEncapsulatedThreadKey(bytes32,uint256,bytes32,bytes32,bytes32)', [
      threadKeyHash,
      new Amorph(0, 'number'),
      eccKeypairs[0].publicKey,
      eccKeypairs[2].publicKey,
      encapsulatedThreadKey02
    ]).getConfirmation()
  })

  it('should be able to add descriptor', () => {
    const encapsulatedMultiaddress = safecommUtils.encapsulate(multiaddress, threadKey, true)
    return safecomm.broadcast('addDescriptor(bytes32,uint256,bytes)', [
      threadKeyHash, new Amorph(0, 'number'), encapsulatedMultiaddress
    ]).getConfirmation().then(() => {
      return safecomm.fetch('threadsDescriptors(bytes32,uint256)', [
        threadKeyHash, new Amorph(0, 'number')
      ]).then((descriptor) => {
        descriptor.sender.should.amorphEqual(personas[0].address)
        descriptor.timestamp.should.amorphEqual(ultralightbeam.blockPoller.block.timestamp)
        descriptor.encapsulatedMultiaddress.should.amorphEqual(encapsulatedMultiaddress)
      })
    })
  })

  it('thread should have correct counts', () => {
    return safecomm.fetch('threads(bytes32)', [threadKeyHash]).then((_thread) => {
      _thread.participantsCount.to('number').should.equal(3)
      _thread.encapsulatedThreadKeysCount.to('number').should.equal(2)
      _thread.descriptorsCount.to('number').should.equal(1)
    })
  })
})
