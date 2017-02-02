const fs = require('fs')
const Amorph = require('./Amorph')
const _ = require('lodash')

const contractsJson = fs.readFileSync('generated/contracts.json')
const _contracts = JSON.parse(contractsJson).contracts
const soliditySha3 = require('solidity-sha3')

const contracts = {}

_.forEach(_contracts, (_contract, contractName) => {
  contracts[contractName] = {}
  contracts[contractName].abi = JSON.parse(_contract.interface)
  contracts[contractName].code = new Amorph(_contract.bytecode, 'hex')
  contracts[contractName].runcode = new Amorph(_contract.runtimeBytecode, 'hex')
  contracts[contractName].codeHash = new Amorph(soliditySha3.default(`0x${_contract.bytecode}`), 'hex.prefixed')
})

module.exports = contracts
