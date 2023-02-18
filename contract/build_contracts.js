var Mustache = require('mustache');
var TOK = require('./tokens.js');
var fs = require('fs');
const execSync = require('child_process').execSync;

Mustache.escape = function (value) {
    return value;
};

class CompiledContract {
    constructor(compiledOutputString) {
        this.full = compiledOutputString;
        const compileOutputArray = compiledOutputString.split("\r\n").filter(str => str != '');
        if (compileOutputArray.length === 6) {
            this.scriptAddress = compileOutputArray[5];
            this.scriptHash = compileOutputArray[3];
        } else {
            this.scriptAddress = "";
            this.scriptHash = "";
        }
    }
}
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
function compileContract(contract, symbols = '') {
    console.log(`Building contract ${contract} ${symbols} ...`)
    var command = `java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ${contract} ${symbols}`;
    const compileOutput = execSync(command).toString();
    const compiledContract = new CompiledContract(compileOutput);
    return compiledContract;
}

const buildBaseDir = './build/';
var jsTokenList = [], symbolFileName = '';

// Compile static contracts
const optionCompiledContract = compileContract('./Option.es');
const buyCompiledContract = compileContract('./Buy_Token_Request.es');
const sellFixedCompiledContract = compileContract('./Sell_Token_Request.es');

// Compile Sell contracts depeding on tokenid and oracle nft
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

    const symbolsTemplate = fs.readFileSync('./templates/symbols.json.mu').toString();
    token.optionScriptHash = optionCompiledContract.scriptHash;
    const symbols = Mustache.render(symbolsTemplate, token);

    // Cleanup build directory
    const buildDir = buildBaseDir + tokenTicker;
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });
    //console.log(output)

    // Compile option sell contract
    const optionSellContractFilename = buildDir + "/Option_Sell_" + tokenTicker + ".es";
    symbolFileName = buildDir + "/symbols_" + tokenTicker + ".json";
    fs.writeFileSync(optionSellContractFilename, optionSellContract);
    fs.writeFileSync(symbolFileName, symbols);
    const optionSellCompiledContract = compileContract(optionSellContractFilename, symbolFileName);

    jsTokenList.push(new UnderlyingToken(token.name, token.tokenId, token.decimals, token.oracleTokenId, token.oracleType,
        token.icon, optionSellCompiledContract.scriptAddress))

}

// Compile exercise request contract, linked with the option contract
const exerciseCompiledContract = compileContract('./Exercise_Option_Request.es', symbolFileName);

const scriptConstants = {
    buyOptionAddress: buyCompiledContract.scriptAddress,
    optionAddress: optionCompiledContract.scriptAddress,
    exerciseOptionAddress: exerciseCompiledContract.scriptAddress,
    sellFixedAddress: sellFixedCompiledContract.scriptAddress,
    underluyingTokensJSON: JSON.stringify(jsTokenList, null, 4), 
}

// Create the contant file
const scriptConstantTemplate = fs.readFileSync('./templates/script_constants.js.mu').toString();
const optionSellContract = Mustache.render(scriptConstantTemplate, scriptConstants);
fs.writeFileSync(buildBaseDir + 'script_constants.js', optionSellContract);

