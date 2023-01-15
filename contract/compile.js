const exec = require('child_process').exec;
const fs = require('fs');
const myArgs = process.argv.slice(2);
const symbolFile = myArgs[0];

const scripts = [
    'Option.es',
    'Buy_Option_Request.es',
    'Exercise_Option_Request.es',
]

const command = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + scripts[0] + ' ' + symbolFile;
const childPorcess0 = exec(command, function (err, stdout, stderr) {
    if (err) {
        console.log(err)
    }

    const res = stdout.split("\r\n").filter(str => str != '');
    console.log('export const OPTION_CALL_SCRIPT_ADDRESS="' + res[5] + '";')
    const optionCallScriptHash = res[3];
    const symbolFilePrefixed = './' + symbolFile;
    const symbolFileJSON = require(symbolFilePrefixed);
    for (const i in symbolFileJSON.symbols) {
        if (symbolFileJSON.symbols[i].name === 'OptionCallScriptHash') {
            symbolFileJSON.symbols[i].value = optionCallScriptHash;
        }
    }
    fs.writeFile(symbolFilePrefixed, JSON.stringify(symbolFileJSON, null, 4), function writeJSON(err) {
        if (err) return console.log(err);
        const command1 = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + scripts[1] + ' ' + symbolFile;
        const childPorcess1 = exec(command1, function (err, stdout, stderr) {
            if (err) {
                console.log(err)
            }
        
            const res = stdout.split("\r\n").filter(str => str != '');
            console.log('export const BUY_OPTION_REQUEST_SCRIPT_ADDRESS="' + res[5] + '";')
            
        })

        const command2 = 'java -cp ErgoScriptCompiler-assembly-0.1.jar Compile ' + scripts[2] + ' ' + symbolFile;
        const childPorcess2 = exec(command2, function (err, stdout, stderr) {
            if (err) {
                console.log(err)
            }
        
            const res = stdout.split("\r\n").filter(str => str != '');
            console.log('export const EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS="' + res[5] + '";')
            
        })

    });

})






//
//const fileName = './file.json';
//
//
//file.key = "new value";
//
//fs.writeFile(fileName, JSON.stringify(file), function writeJSON(err) {
//  if (err) return console.log(err);
//  console.log(JSON.stringify(file));
//  console.log('writing to ' + fileName);
//});