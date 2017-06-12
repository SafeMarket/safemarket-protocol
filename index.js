const arguguard = require('arguguard')
const keccak256 = require('keccak256-amorph')
const secp256k1 = require('secp256k1-amorph-utils')
const EC = require('elliptic').ec
const aes = require('aes-128-cbc-amorph')

const Dictionary = require('hendricks/lib/Dictionary')
const Split = require('hendricks/lib/Split')
const Fixed = require('hendricks/lib/Fixed')
const Dynamic = require('hendricks/lib/Dynamic')
const List = require('hendricks/lib/List')

const nameTemplate = new Dynamic('name', 1)
const infoTemplate = new Dynamic('info', 2)
const priceTemplate = new Dynamic('price', 1)

const storeTemplate = new Split('version', 1, ['v0'], [
  new Dictionary('store', [
    new Fixed('publicKey', 33),
    nameTemplate,
    new Dynamic('contact', 1),
    new Dynamic('tagline', 1),
    new Fixed('isOpen', 1),
    new Fixed('base', 2),
    infoTemplate,
    new Fixed('priceSetter', 20),
    new Fixed('currency', 4),
    new Dynamic('bufferMicroperun', 3),
    new Dynamic('minProductsTotal', 1),
    new List('products', 2, new Dictionary('product', [
      nameTemplate,
      priceTemplate,
      infoTemplate,
      new List('imageMultihashes', 1, new Dynamic('imageMultihash', 1))
    ])),
    new List('transports', 1, new Dictionary('transport', [
      nameTemplate,
      priceTemplate,
      infoTemplate,
      new Fixed('to', 2)
    ]))
  ])
])

const orderTemplate = new Split('version', 1, ['v0'], [
  new Dictionary('order', [
    new Fixed('storeMetaHash', 32),
    new Fixed('transportId', 1),
    infoTemplate,
    new List('products', 1,
      new Dictionary('product', [
        new Fixed('id', 2),
        new Fixed('quantity', 1)
      ])
    )
  ])
])

const ec = new EC('secp256k1')
const postiveCompressedPublicKeyPrefix = 0x03

function crawl(thing, callback) {
  arguguard('crawk', ['*', 'function'], arguments)
  switch (thing.constructor.name) {
    case 'Array': {
      return thing.map((thang) => {
        return crawl(thang, callback)
      })
    } case 'Object': {
      const object = {}
      Object.keys(thing).forEach((key) => {
        object[key] = crawl(thing[key], callback)
      })
      return object
    }
    default:
      return callback(thing)
  }
}

function amorphify(object) {
  arguguard('amorphify', ['*'], arguments)
  return crawl(object, (thing) => {
    if (typeof thing === 'string') {
      return thing
    }
    return new exports.Amorph(thing, 'uint8Array')
  })
}

function unamorphify(object) {
  arguguard('unamorphify', ['*'], arguments)
  return crawl(object, (thing) => {
    if (typeof thing === 'string') {
      return thing
    }
    return thing.to('uint8Array')
  })
}

exports.checkLength = function checkLength(amorph, length) {
  arguguard('checkLength', ['Amorph', 'number'], arguments)
  if (!amorph.to('array').length === length) {
    throw new Error()
  }
}

exports.marshalStoreMeta = function marshalStoreMeta(object) {
  arguguard('marshalStoreMeta', ['Object'], arguments)
  return new exports.Amorph(storeTemplate.encode(unamorphify(object)), 'uint8Array')
}

exports.unmarshalStoreMeta = function unmarshalStoreMeta(marshalledStoreMeta) {
  arguguard('marshalStoreMeta', ['Amorph'], arguments)
  return amorphify(storeTemplate.decode(marshalledStoreMeta.to('uint8Array')))
}

exports.marshalOrderMeta = function marshalOrderMeta(object) {
  arguguard('marshalOrderMeta', ['Object'], arguments)
  return new exports.Amorph(orderTemplate.encode(unamorphify(object)), 'uint8Array')
}

exports.unmarshalOrderMeta = function unmarshalOrderMeta(marshalledOrderMeta) {
  arguguard('unmarshalOrderMeta', ['Amorph'], arguments)
  return amorphify(orderTemplate.decode(marshalledOrderMeta.to('uint8Array')))
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
  const transportPrice = storeMeta.value.transports[orderMeta.value.transportId.to('number')].price
  const productPrices = orderMeta.value.products.map((orderProduct) => {
    const product = storeMeta.value.products[orderProduct.id.to('number')]
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
