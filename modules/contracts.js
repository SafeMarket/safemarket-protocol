const amorphParseSolcOutput = require('amorph-parse-solc-output')
const fs = require('fs')
const Amorph = require('./Amorph')

const contractsJson = fs.readFileSync('generated/contracts.json')


module.exports = amorphParseSolcOutput(JSON.parse(contractsJson), Amorph)
