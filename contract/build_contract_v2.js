var fleetCore = require('@fleet-sdk/core');
var fleetCompiler = require('@fleet-sdk/compiler');
var fleetCrypto = require('@fleet-sdk/crypto');
var Mustache = require('mustache');
var fs = require('fs');
var TOK = require('./tokens.js');

const MINER_ERGOTREE = "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";
const buildBaseDir = './build/';

let constants = {
    BoxMinValue: fleetCore.SLong(BigInt(1000000)),
    MinerScriptHash: getFleetCollByte(getErgotreeHash(MINER_ERGOTREE))
}

Mustache.escape = function (value) {
    return value;
};

class UnderlyingToken {
    constructor(label, tokenId, decimals, oracleNFTID, oracleType, icon, sellOptionScriptAddress) {
        this.label = label;
        this.tokenId = tokenId;
        this.decimals = decimals;
        this.oracleNFTID = oracleNFTID;
        this.oracleType = oracleType;
        this.icon = icon;
        this.sellOptionScriptAddress = sellOptionScriptAddress;
    }
}

function compileScript(path, constants = {}) {
    console.log(`Building contract ${path} ...`)
    const ergoscript = fs.readFileSync(path, 'ascii');
    const tree0 = fleetCompiler.compile(ergoscript, { version: 0, segregateConstants: false, map: constants });
    return {
        address: tree0.toAddress().encode(fleetCore.Network.Mainnet),
        ergotree: tree0.toHex(),
        hash: getErgotreeHash(tree0.toHex()),
    }
}

function getErgotreeHash(ergoTreeHex) {
    return fleetCrypto.hex.encode(fleetCrypto.blake2b256(fleetCrypto.hex.decode(ergoTreeHex)))
}

function getFleetCollByte(strHex) {
    return fleetCore.SColl(fleetCore.SByte, Uint8Array.from(Buffer.from(strHex, 'hex')))
}

const peerBoxScript = compileScript("PeerBox.es", constants)
console.log("PeerBox", peerBoxScript)
constants.PeerBoxScriptHash = getFleetCollByte(peerBoxScript.hash)

const optionScript = compileScript("Option.es", constants)
console.log("Option", optionScript)
constants.OptionScriptHash = getFleetCollByte(optionScript.hash)

const exerciseOptionScript = compileScript("Exercise_Option_Request.es", constants)
//console.log("Exercise Option", exerciseOptionScript)

const buyTokenResquestScript =  compileScript("Buy_Token_Request.es", constants)
//console.log("Buy token request", buyTokenResquestScript)

const sellTokenRequestScript = compileScript('Sell_Token_Request.es', constants);
//console.log("Sell token request", sellTokenRequestScript)

// Compile Sell contracts depeding on tokenid and oracle nft
var jsTokenList = []
for (var token of TOK.TOKENS) {
    const tokenTicker = token.name.toUpperCase()

    token.decimalFactor = Math.pow(10, token.decimals)
    if (token.oracleType === "Oracle") {
        token.validOracle = fs.readFileSync('./templates/ValidOracle.mu.es').toString()
    } else {
        token.validOracle = fs.readFileSync('./templates/ValidOracleAMM.mu.es').toString();
    }
    const optionSellScriptTemplate = fs.readFileSync('./templates/Option_Sell.mu.es').toString();
    const optionSellContract = Mustache.render(optionSellScriptTemplate, token);
    // Cleanup build directory
    const buildDir = buildBaseDir + tokenTicker;
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });
    const optionSellContractFilename = buildDir + "/Option_Sell_" + tokenTicker + ".es";
    fs.writeFileSync(optionSellContractFilename, optionSellContract);

    constants.UnderlyingAssetTokenId = getFleetCollByte(getErgotreeHash(token.tokenId))
    constants.UnderlyingAssetDecimalFactor = fleetCore.SLong(BigInt(token.decimalFactor)),
    constants.OracleTokenId = getFleetCollByte(getErgotreeHash(token.oracleTokenId))

    const optionSellCompiledScript = compileScript(optionSellContractFilename, constants);

    jsTokenList.push(new UnderlyingToken(token.name, token.tokenId, token.decimals, token.oracleTokenId, token.oracleType,
        token.icon, optionSellCompiledScript.address))

    
}

// Create the script_constants.js file
const scriptConstants = {
    buyOptionAddress: buyTokenResquestScript.address,
    optionAddress: optionScript.address,
    exerciseOptionAddress: exerciseOptionScript.address,
    sellFixedAddress: sellTokenRequestScript.address,
    peerBoxAddress: peerBoxScript.address,
    underluyingTokensJSON: JSON.stringify(jsTokenList, null, 4), 
}
const scriptConstantTemplate = fs.readFileSync('./templates/script_constants.js.mu').toString();
const optionSellContract = Mustache.render(scriptConstantTemplate, scriptConstants);
fs.writeFileSync(buildBaseDir + 'script_constants.js', optionSellContract);

console.log(buildBaseDir + 'script_constants.js', "Successully generated")
