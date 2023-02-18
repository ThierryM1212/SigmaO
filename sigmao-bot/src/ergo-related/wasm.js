let ergolib = import('ergo-lib-wasm-nodejs');
import JSONBigInt from 'json-bigint';
import { currentHeight, getExplorerBlockHeadersFull } from './explorer.js';
import crypto from "crypto-js";


export async function getErgoStateContext() {
    return await getErgoStateContext2(0);
}

export async function getErgoStateContext2(contextId) {
    const explorerContext = (await getExplorerBlockHeadersFull()).splice(contextId, 10);
    const block_headers = (await ergolib).BlockHeaders.from_json(explorerContext);
    const pre_header = (await ergolib).PreHeader.from_block_header(block_headers.get(0));
    const context = new (await ergolib).ErgoStateContext(pre_header, block_headers);
    return context;
}

export async function signTransaction(unsignedTx, inputs, dataInputs, wallet) {
    //console.log("signTransaction1", unsignedTx, inputs, dataInputs);
    const unsignedTransaction = (await ergolib).UnsignedTransaction.from_json(JSONBigInt.stringify(unsignedTx));
    const inputBoxes = (await ergolib).ErgoBoxes.from_boxes_json(inputs);
    const dataInputsBoxes = (await ergolib).ErgoBoxes.from_boxes_json(dataInputs);
    const ctx = await getErgoStateContext();
    //console.log("signTransaction2", unsignedTx, inputs, dataInputs);
    const signedTx = wallet.sign_transaction(ctx, unsignedTransaction, inputBoxes, dataInputsBoxes);
    const res = signedTx.to_json();
    unsignedTransaction.free();
    inputBoxes.free();
    dataInputsBoxes.free();

    return res;
}

export async function signTransactionMultiContext(unsignedTx, inputs, dataInputs, wallet) {
    //console.log("signTransaction1", unsignedTx, inputs, dataInputs);
    const unsignedTransaction = (await ergolib).UnsignedTransaction.from_json(JSONBigInt.stringify(unsignedTx));
    const inputBoxes = (await ergolib).ErgoBoxes.from_boxes_json(inputs);
    const dataInputsBoxes = (await ergolib).ErgoBoxes.from_boxes_json(dataInputs);
    for (let i = 0; i < 10; i++) {
        try {
            const ctx = await getErgoStateContext2(i);
            const signedTx = wallet.sign_transaction(ctx, unsignedTransaction, inputBoxes, dataInputsBoxes);
            const txJSON = signedTx.to_json();
            unsignedTransaction.free();
            inputBoxes.free();
            dataInputsBoxes.free();
            signedTx.free();
            console.log("try " + i.toString())
            return txJSON;
        } catch (e) {
            null;
        }
    }

}

export async function setBoxRegisterByteArray(box, register, str_value) {
    const value_Uint8Array = new TextEncoder().encode(str_value);
    box.set_register_value(register, (await ergolib).Constant.from_byte_array(value_Uint8Array));
}

export async function encodeLong(num) {
    return (await ergolib).Constant.from_i64((await ergolib).I64.from_str(num));
}

async function boxCandidateToJsonMin(boxCandidate) {
    var res = {};
    res["value"] = boxCandidate.value().as_i64().as_num().toString();
    res["ergoTree"] = boxCandidate.ergo_tree().to_base16_bytes();
    res["address"] = (await ergolib).Address.recreate_from_ergo_tree(boxCandidate.ergo_tree()).to_base58();
    var tokens = [];
    for (let i = 0; i < boxCandidate.tokens().len(); i++) {
        tokens.push(boxCandidate.tokens().get(i).to_js_eip12())
    }
    res["assets"] = tokens;
    return res;
}
async function boxCandidatesToJsonMin(boxCandidates) {
    var res = [];
    for (let i = 0; i < boxCandidates.len(); i++) {
        res.push(await boxCandidateToJsonMin(boxCandidates.get(i)))
    }
    return res;
}

export async function createTransaction(boxSelection, outputCandidates, dataInputs, changeAddress, utxos, txFee, burnTokens = false) {
    //console.log("createTransaction utxos", utxos);
    const creationHeight = await currentHeight();

    // build the change box
    var outputJs = await boxCandidatesToJsonMin(outputCandidates);
    const missingErgs = getMissingErg(utxos, outputJs) - BigInt(txFee);
    const tokens = getMissingTokens(utxos, outputJs);
    //console.log("missing tokens, missingErgs", tokens, missingErgs);

    if (!burnTokens && (missingErgs > 0 || Object.keys(tokens).length > 0)) {
        const changeBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(missingErgs.toString()));
        const changeBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            changeBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(changeAddress)),
            creationHeight);
        for (const tokId of Object.keys(tokens)) {
            const tokenId = (await ergolib).TokenId.from_str(tokId);
            const tokenAmount = (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(tokens[tokId].toString()));
            changeBoxBuilder.add_token(tokenId, tokenAmount);
        }
        try {
            outputCandidates.add(changeBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }
    }
    const txBuilder = (await ergolib).TxBuilder.new(
        boxSelection,
        outputCandidates,
        creationHeight,
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(txFee.toString())),
        (await ergolib).Address.from_base58(changeAddress));
    var dataInputsWASM = new (await ergolib).DataInputs();
    for (const box of dataInputs) {
        const boxIdWASM = (await ergolib).BoxId.from_str(box.boxId);
        const dataInputWASM = new (await ergolib).DataInput(boxIdWASM);
        dataInputsWASM.add(dataInputWASM);
    }
    txBuilder.set_data_inputs(dataInputsWASM);
    if (burnTokens) {
        const burnTokensWASM = new (await ergolib).Tokens();
        for (const tokId of Object.keys(tokens)) {
            const tokWASM = new (await ergolib).Token(
                (await ergolib).TokenId.from_str(tokId),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(tokens[tokId].toString()))
            )
            burnTokensWASM.add(tokWASM);
        }
        txBuilder.set_token_burn_permit(burnTokensWASM);
    }
    const txtmp = txBuilder.build().to_json();
    const tx = parseUnsignedTx(txtmp);

    const unsignedTx = (await ergolib).UnsignedTransaction.from_json(JSONBigInt.stringify(tx))
    var correctTx = parseUnsignedTx(unsignedTx.to_json());

    // Put back complete selected inputs in the same order
    correctTx.inputs = correctTx.inputs.map(box => {
        const fullBoxInfo = parseUtxo(utxos.find(utxo => utxo.boxId === box.boxId));
        return {
            ...fullBoxInfo,
            extension: {}
        };
    });
    // Put back complete selected datainputs in the same order
    correctTx.dataInputs = correctTx.dataInputs.map(box => {
        const fullBoxInfoTmp = dataInputs.find(utxo => utxo.boxId === box.boxId);
        const fullBoxInfo = parseUtxo(fullBoxInfoTmp);
        return {
            ...fullBoxInfo,
            extension: {}
        };
    });

    return correctTx;
}

export function parseUnsignedTx(str) {
    let json = JSONBigInt.parse(str);
    return {
        id: json.id,
        inputs: json.inputs,
        dataInputs: json.dataInputs,
        outputs: json.outputs.map(output => (parseUtxo(output))),
    };
}

export function parseUtxo(json, addExtention = true, mode = 'input') {
    if (json === undefined) {
        return {};
    }
    var res = {};
    if (mode === 'input') {
        if ("id" in json) {
            res["boxId"] = json.id;
        } else {
            res["boxId"] = json.boxId;
        }
    }
    res["value"] = json.value.toString();
    res["ergoTree"] = json.ergoTree;
    if (Array.isArray(json.assets)) {
        res["assets"] = json.assets.map(asset => ({
            tokenId: asset.tokenId,
            amount: asset.amount.toString(),
            name: asset.name ?? '',
            decimals: asset.decimals ?? 0,
        }));
    } else {
        res["assets"] = [];
    }
    if (isDict(json["additionalRegisters"])) {
        res["additionalRegisters"] = parseAdditionalRegisters(json.additionalRegisters);
    } else {
        res["additionalRegisters"] = {};
    }

    res["creationHeight"] = json.creationHeight;

    if ("address" in json) {
        res["address"] = json.address;
    }

    if (mode === 'input') {
        if ("txId" in json) {
            res["transactionId"] = json.txId;
        } else {
            res["transactionId"] = json.transactionId;
        }
        res["index"] = json.index;
    }
    if (addExtention) {
        res["extension"] = {};
    }
    return res;
}

export function parseUtxos(utxos, addExtention, mode = 'input') {
    var utxosFixed = [];
    for (const i in utxos) {
        utxosFixed.push(parseUtxo(utxos[i], addExtention, mode))
    }
    return utxosFixed;
}

function parseAdditionalRegisters(json) {
    var registterOut = {};
    //console.log("json",json);
    Object.entries(json).forEach(([key, value]) => {
        //console.log("key",key,"value",value);
        if (isDict(value)) {
            registterOut[key] = value["serializedValue"];
        } else {
            registterOut[key] = value;
        }
    });
    //console.log("registterOut",registterOut);
    return registterOut;
}

export async function getWalletForAddress(mnemonic, address) {
    const dlogSecret = await getSecretForAddress(mnemonic, address);
    var secretKeys = new (await ergolib).SecretKeys();
    secretKeys.add(dlogSecret);
    return (await ergolib).Wallet.from_secrets(secretKeys);
}

async function getSecretForAddress(mnemonic, address) {
    const seed = (await ergolib).Mnemonic.to_seed(mnemonic, "");
    const rootSecret = (await ergolib).ExtSecretKey.derive_master(seed);
    const changePath = await getDerivationPathForAddress(rootSecret, address);
    const changeSecretKey = deriveSecretKey(rootSecret, changePath);
    const dlogSecret = (await ergolib).SecretKey.dlog_from_bytes(changeSecretKey.secret_key_bytes());
    return dlogSecret;
}

async function getDerivationPathForAddress(rootSecret, address) {
    let path = (await ergolib).DerivationPath.new(0, new Uint32Array([0]));
    var subsequentsMaxes = [10, 100, 1000];

    for (const max of subsequentsMaxes) {
        var i = 0, j = 0, found = false;
        while (i < max && !found) {
            j = 0;
            while (j < max && !found) {
                let path = (await ergolib).DerivationPath.new(i, new Uint32Array([j]));
                //console.log("getDerivationPathForAddress", i, j, path.toString());
                const changeSecretKey = deriveSecretKey(rootSecret, path);
                const changePubKey = changeSecretKey.public_key();
                const changeAddress = (await ergolib).NetworkAddress.new((await ergolib).NetworkPrefix.Mainnet, changePubKey.to_address()).to_base58();
                if (changeAddress === address) {
                    found = true;
                    return (await ergolib).DerivationPath.new(i, new Uint32Array([j]));
                }
                freeList([changeAddress, changePubKey, changeSecretKey, path])
                j++;
            }
            i++;
        }
    }
    return path;
}

const deriveSecretKey = (rootSecret, path) =>
    rootSecret.derive(path);

function isDict(v) {
    return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export async function encodeLongArray(longArray) {
    return (await ergolib).Constant.from_i64_str_array(longArray);
}

export async function ergoTreeToAddress(ergoTree) {
    //console.log("ergoTreeToAddress",ergoTree);
    const ergoT = (await ergolib).ErgoTree.from_base16_bytes(ergoTree);
    const address = (await ergolib).Address.recreate_from_ergo_tree(ergoT);
    const addrStr = address.to_base58();
    freeList([ergoT, address])
    return addrStr;
}

export async function addressToErgotree(address) {
    const addressWASM = (await ergolib).Address.from_base58(address);
    const ergoTree = addressWASM.to_ergo_tree().to_base16_bytes();
    freeList([addressWASM])
    return ergoTree;
}

export async function encodeIntArray(intArray) {
    return (await ergolib).Constant.from_i32_array(intArray);
}

export async function decodeIntArray(encodedArray) {
    return (await ergolib).Constant.decode_from_base16(encodedArray).to_i32_array()
}

export async function ergoTreeToTemplate(ergoTree) {
    const ergoTreeWASM = (await ergolib).ErgoTree.from_base16_bytes(ergoTree);
    const ergoTreeStr = toHexString(ergoTreeWASM.template_bytes())
    freeList([ergoTreeWASM])
    return ergoTreeStr;
}

export async function ergoTreeToTemplateHash(ergoTree) {
    try {
        const ergoTreeTemplateHex = await ergoTreeToTemplate(ergoTree);
        //return toHexString(ergoTreeWASM.template_bytes());
        return crypto.SHA256(crypto.enc.Hex.parse(ergoTreeTemplateHex)).toString(crypto.enc.Hex);
    } catch (e) {
        console.log("ergoTreeToTemplateHash", e);
        return "";
    }
}

export function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}



export function getUtxosListValue(utxos) {
    return utxos.reduce((acc, utxo) => acc += BigInt(utxo.value), BigInt(0));
}

export function getTokenListFromUtxos(utxos) {
    var tokenList = {};
    for (const i in utxos) {
        for (const j in utxos[i].assets) {
            const tokenId = utxos[i].assets[j].tokenId.toString();
            if (utxos[i].assets[j].tokenId in tokenList) {
                tokenList[tokenId] = BigInt(tokenList[tokenId]) + BigInt(utxos[i].assets[j].amount);
            } else {
                tokenList[tokenId] = BigInt(utxos[i].assets[j].amount);
            }
        }
    }
    return tokenList;
}

export function getMissingErg(inputs, outputs) {
    const amountIn = getUtxosListValue(inputs);
    const amountOut = getUtxosListValue(outputs);
    if (amountIn >= amountOut) {
        return amountIn - amountOut;
    } else {
        return BigInt(0);
    }
}

export function getMissingTokens(inputs, outputs) {
    const tokensIn = getTokenListFromUtxos(inputs);
    const tokensOut = getTokenListFromUtxos(outputs);
    var res = {};
    if (tokensIn !== {}) {
        for (const token in tokensIn) {
            if (tokensOut !== {} && token in tokensOut) {
                if (tokensIn[token] - tokensOut[token] > 0) {
                    res[token] = tokensIn[token] - tokensOut[token];
                }
            } else {
                res[token] = tokensIn[token];
            }
        }
    }
    return res;
}

export async function buildBalanceBox(inputs, outputs, address) {
    const missingErgs = getMissingErg(inputs, outputs).toString();
    const contract = await encodeContract(address);
    const tokens = buildTokenList(getMissingTokens(inputs, outputs));
    const height = await currentHeight();

    return {
        value: missingErgs,
        ergoTree: contract,
        assets: tokens,
        additionalRegisters: {},
        creationHeight: height,
        extension: {},
        index: undefined,
        boxId: undefined,
    };
}

export function buildTokenList(tokens) {
    var res = [];
    if (tokens !== {}) {
        for (const i in tokens) {
            res.push({ "tokenId": i, "amount": tokens[i].toString() });
        }
    };
    return res;
}

export function freeList(WASMObjectList) {
    var i = 0;
    for (const o of WASMObjectList) {
        try {
            o.free();
        } catch (e) {
            console.log("freelist", i, e.toString())
        }
        i = i + 1;
    }
}

export function getRegisterValue(box, register) {
    if (box.additionalRegisters) {
        if (isDict(box.additionalRegisters[register])) {
            //console.log("getRegisterValue", box.additionalRegisters[register].serializedValue);
            return box.additionalRegisters[register].serializedValue;
        } else {
            return box.additionalRegisters[register];
        }
    } else {
        return "";
    }
}

