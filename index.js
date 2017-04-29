const arguguard = require('arguguard')
const protobufjs = require('protobufjs')
const protofile = require('./safemarket.proto')
const keccak256 = require('keccak256-amorph')
const secp256k1 = require('secp256k1-amorph-utils')
const EC = require('elliptic').ec
const aes = require('aes-128-cbc-amorph')
const protomorph = require('protomorph')

const protoRoot = protobufjs.parse(protofile).root
const storeProtoType = protoRoot.lookup('safemarket.Store')
const orderProtoType = protoRoot.lookup('safemarket.Order')

const ec = new EC('secp256k1')
const postiveCompressedPublicKeyPrefix = 0x03

exports.checkLength = function checkLength(amorph, length) {
  arguguard('checkLength', ['Amorph', 'number'], arguments)
  if (!amorph.to('array').length === length) {
    throw new Error()
  }
}

exports.marshalStoreMeta = function marshalStoreMeta(object) {
  arguguard('marshalStoreMeta', ['Object'], arguments)
  return protomorph.encode(storeProtoType, object)
}

exports.unmarshalStoreMeta = function unmarshalStoreMeta(marshalledStoreMeta) {
  arguguard('marshalStoreMeta', ['Amorph'], arguments)
  return protomorph.decode(storeProtoType, marshalledStoreMeta)
}

exports.marshalOrderMeta = function marshalOrderMeta(object) {
  arguguard('marshalOrderMeta', ['Object'], arguments)
  return protomorph.encode(orderProtoType, object)
}

exports.encrypt = function encrypt(plaintext, key, iv) {
  arguguard('encrypt', ['Amorph', 'Amorph', 'Amorph'], arguments)
  const paddedPlaintext = plaintext.as('array', (_array) => {
    const array = _array.slice(0)
    array.push(0x01)
    const paddedPlaintextLength = 16 * Math.ceil(array.length / 16)
    const paddingLength = paddedPlaintextLength - array.length
    const padding = Array(paddingLength).fill(0)
    return array.concat(padding)
  })
  return aes.encrypt(paddedPlaintext, key, iv)
}

exports.decrypt = function decrypt(ciphertext, key, iv) {
  arguguard('decrypt', ['Amorph', 'Amorph', 'Amorph'], arguments)
  const paddedPlaintext = aes.decrypt(ciphertext, key, iv)
  return paddedPlaintext.as('array', (array) => {
    const paddingStart = array.lastIndexOf(0x01)
    return array.slice(0, paddingStart)
  })
}

exports.encapsulate = function encapsulate(ciphertext, iv) {
  arguguard('encapsulate', ['Amorph', 'Amorph'], arguments)
  exports.checkLength(iv, 16)
  return iv.as('array', (array) => {
    return array.concat(ciphertext.to('array'))
  })
}

exports.unencapsulate = function unencapsulate(encapsulation) {
  arguguard('unencapsulate', ['Amorph'], arguments)
  return {
    iv: encapsulation.as('array', (array) => {
      return array.slice(0, 16)
    }),
    ciphertext: encapsulation.as('array', (array) => {
      return array.slice(16)
    })
  }
}

exports.calculatePrebufferCURR = function calculatePrebufferCURR(storeMeta, orderMeta) {
  arguguard('calculatePrebufferCURR', ['Object', 'Object'], arguments)
  const transportPrice = storeMeta.transports[orderMeta.transportId.to('number')].price
  const productPrices = orderMeta.products.map((orderProduct) => {
    const product = storeMeta.products[orderProduct.id.to('number')]
    return product.price.as('bignumber', (bignumber) => {
      return bignumber.times(orderProduct.quantity.to('bignumber'))
    })
  })
  return productPrices.reduce((a, b) => {
    return a.as('bignumber', (bignumber) => {
      return bignumber.plus(b.to('bignumber'))
    })
  }, transportPrice)
}

exports.unmarshalOrderMeta = function unmarshalOrderMeta(marshalledStoreMeta) {
  arguguard('unmarshalOrderMeta', ['Amorph'], arguments)
  return protomorph.decode(orderProtoType, marshalledStoreMeta)
}

exports.deriveLinkedAddress = function deriveLinkedAddress(link, publicKey) {
  arguguard('getLinkedAddress', ['Amorph', 'Amorph'], arguments)
  const publicKeyLength = publicKey.to('array').length
  let uncompressedPublicKey
  if (publicKeyLength === 33) {
    uncompressedPublicKey = secp256k1.convertPublicKey(publicKey, false)
  } else if (publicKeyLength === 65) {
    uncompressedPublicKey = publicKey
  } else {
    throw new Error(`Public key should be 33 or 65 bytes got, ${publicKey.to('array').length}`)
  }
  const uncompressedLinkedPublicKey = secp256k1.deriveLinkedPublicKey(link, uncompressedPublicKey, false)
  return keccak256(uncompressedLinkedPublicKey.as('array', (array) => {
    return array.slice(1)
  })).as('array', (array) => {
    return array.slice(-20)
  })
}

module.exports.deriveBilateralKey = function deriveBilateralKey(privateKey, publicKey) {
  arguguard('getBilateralKey', ['Amorph', 'Amorph'], arguments)
  const derived = privateKey.as('buffer', (privateKeyBuffer) => {
    const ecKeypair = ec.keyFromPrivate(privateKeyBuffer)
    const ecPublicKey = ec.keyFromPublic(publicKey.to('buffer')).getPublic()
    return ecKeypair.derive(ecPublicKey).toBuffer()
  })

  return keccak256(derived)
}

module.exports.stripCompressedPublicKey = function stripCompressedPublicKey(compressedPublicKey) {
  arguguard('stripCompressedPublicKey', ['Amorph'], arguments)
  exports.checkLength(compressedPublicKey, 33)
  if (compressedPublicKey.to('array')[0] !== postiveCompressedPublicKeyPrefix) {
    throw new Error()
  }
  return compressedPublicKey.as('array', (array) => {
    return array.slice(1)
  })
}

module.exports.unstripCompressedPublicKey = function unstripCompressedPublicKey(strippedCompressedPublicKey) {
  arguguard('unstripCompressedPublicKey', ['Amorph'], arguments)
  exports.checkLength(strippedCompressedPublicKey, 32)
  return strippedCompressedPublicKey.as('array', (array) => {
    return [postiveCompressedPublicKeyPrefix].concat(array)
  })
}

module.exports.unmarshalSpem = function unmarshalSpem(spem) {
  arguguard('unmarshalSpem', ['Amorph'], arguments)
  return {
    sender: spem.as('array', (array) => {
      return array.slice(0, 20)
    }),
    encapsulatedMessage: spem.as('array', (array) => {
      return array.slice(20)
    })
  }
}
