const utils = require('../')
const random = require('random-amorph')

describe('encryption/encapsulation', () => {
  const keySizes = [16, 32]
  const plaintextSizes = [0, 1, 15, 16, 17, 31, 32, 33]
  const ciphertextSizes = [16, 16, 16, 32, 32, 32, 48, 48]

  keySizes.forEach((keySize) => {
    describe(`key size: ${keySize}`, () => {
      plaintextSizes.forEach((plaintextSize, index) => {
        describe(`plaintext size: ${keySize}`, () => {
          const key = random(keySize)
          const iv = random(16)
          const plaintext = random(plaintextSize)
          let ciphertext
          let encapsulation
          let unencapsulation
          it('should encrypt', () => {
            ciphertext = utils.encrypt(plaintext, key, iv)
          })
          it('ciphertext should be correct length', () => {
            ciphertext.to('array').should.have.length(ciphertextSizes[index])
          })
          it('should encapsulate', () => {
            encapsulation = utils.encapsulate(ciphertext, iv)
          })
          it('should unencapsulate', () => {
            unencapsulation = utils.unencapsulate(encapsulation)
          })
          it('unencapsulation should have correct keys', () => {
            unencapsulation.should.have.keys(['iv', 'ciphertext'])
          })
          it('unencapsulation should have correct iv', () => {
            unencapsulation.iv.should.amorphEqual(iv)
          })
          it('unencapsulation should have correct ciphertext', () => {
            unencapsulation.ciphertext.should.amorphEqual(ciphertext)
          })
          it('should unencrypt to plaintext', () => {
            utils.decrypt(unencapsulation.ciphertext, key, iv).should.amorphEqual(plaintext)
          })
        })
      })
    })
  })
})
