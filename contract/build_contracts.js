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
    constructor(label, tokenId, decimals, oracleNFTID, optionScriptAddress, exerciseOptionScriptAddress) {
        this.label = label;
        this.tokenId = tokenId;
        this.decimals = decimals;
        this.oracleNFTID = oracleNFTID;
        this.optionScriptAddress = optionScriptAddress;
        this.exerciseOptionScriptAddress = exerciseOptionScriptAddress;
    }
}
const buildBaseDir = './build/';

var jsTokenList = [];

for (var token of TOK.TOKENS) {
    const tokenTicker = token.name.toUpperCase()

    console.log("Building contracts for " + tokenTicker + "/ERG")
    token.decimalFactor = Math.pow(10, token.decimals)
    if (token.oracleType === "Oracle") {
        token.validOracle = fs.readFileSync('./templates/ValidOracle.template.es').toString()
    } else {
        token.validOracle = fs.readFileSync('./templates/ValidOracleAMM.template.es').toString();
    }
    const optionScriptTemplate = fs.readFileSync('./templates/Option.template.es').toString();
    const optionContract = Mustache.render(optionScriptTemplate, token);

    const symbolsTemplate = fs.readFileSync('./templates/symbols.template.json').toString();
    const symbols = Mustache.render(symbolsTemplate, token);

    // Cleanup build directory
    const buildDir = buildBaseDir + tokenTicker;
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });
    //console.log(output)

    // Compile option contract
    const optionContractFilename = buildDir + "/Option_" + tokenTicker + ".es";
    const symbolFileName = buildDir + "/symbols_" + tokenTicker + ".json";
    fs.writeFileSync(optionContractFilename, optionContract);
    fs.writeFileSync(symbolFileName, symbols);
    const command = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + optionContractFilename + ' ' + symbolFileName;
    const compileOutput = execSync(command).toString();

    // Update scriptHash in json file
    const optionCompiledContract = new CompiledContract(compileOutput)
    if (optionCompiledContract.scriptAddress !== "") {
        var symbolFileJSON = require(symbolFileName);
        for (const i in symbolFileJSON.symbols) {
            if (symbolFileJSON.symbols[i].name === 'OptionCallScriptHash') {
                symbolFileJSON.symbols[i].value = optionCompiledContract.scriptHash;
            }
        }
        fs.writeFileSync(symbolFileName, JSON.stringify(symbolFileJSON, null, 4));
    } else {
        console.log("ERROR executing: ", command);
        console.log("ERROR: ", compileOutput);
        continue;
    }

    // Compile exercise request contract
    const exerciseContractFileName = './Exercise_Option_Request.es';
    const command1 = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + exerciseContractFileName + ' ' + symbolFileName;
    const exerciseCompileOutput = execSync(command1).toString();
    const exerciseCompiledContract = new CompiledContract(exerciseCompileOutput);

    jsTokenList.push(new UnderlyingToken(token.name, token.tokenId, token.decimals, token.oracleTokenId,
        optionCompiledContract.scriptAddress, exerciseCompiledContract.scriptAddress))

}

// Compile buy request contract
const buyContractFileName = './Buy_Option_Request.es';
const command2 = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + buyContractFileName + " " + buildBaseDir  + jsTokenList[0].label.toUpperCase() + "/symbols_" + jsTokenList[0].label.toUpperCase() + ".json";
const buyCompileOutput = execSync(command2).toString();
const buyCompiledContract = new CompiledContract(buyCompileOutput);

//console.log(JSON.stringify(jsTokenList, null, 4))

var scriptContantContent = 'export const BUY_OPTION_REQUEST_SCRIPT_ADDRESS="' + buyCompiledContract.scriptAddress + '";\n';
scriptContantContent = scriptContantContent + "export const UNDERLYING_TOKENS = " + JSON.stringify(jsTokenList, null, 4);

fs.writeFileSync(buildBaseDir + 'script_constants.js', scriptContantContent);
