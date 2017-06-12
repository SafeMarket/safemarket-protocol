const amorphParseSolcOutput = require('amorph-parse-solc-output')
const fs = require('fs')
const Amorph = require('./Amorph')
const path = require('path')

const contractsJson = fs.readFileSync(path.join(__dirname, '../generated/contracts.json'))

module.exports = amorphParseSolcOutput(JSON.parse(contractsJson), Amorph)
