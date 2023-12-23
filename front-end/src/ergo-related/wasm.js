import JSONBigInt from 'json-bigint';
import { currentHeight, getExplorerBlockHeaders, getExplorerBlockHeadersFull } from './explorer';
import { NANOERG_TO_ERG } from '../utils/constants';
import { TextEncoder } from 'text-decoding';
import { byteArrayToBase64, encodeContract } from './serializer';
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

async function boxCandidateToJsonMin(boxCandidate) {
    var res = {};
    res["value"] = boxCandidate.value().as_i64().as_num().toString();
    res["ergoTree"] = boxCandidate.ergo_tree().to_base16_bytes();
    res["address"] = (await ergolib).Address.recreate_from_ergo_tree(boxCandidate.ergo_tree()).to_base58();
    var tokens = [];
    for (let i = 0; i < boxCandidate.tokens().len(); i++) {
        tokens.push(JSONBigInt.parse(boxCandidate.tokens().get(i).to_json()))
    }
    res["assets"] = tokens;
    console.log("boxCandidateToJsonMin", res)
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
    //console.log("json", json);
    Object.entries(json).forEach(([key, value]) => {
        //console.log("key", key, "value", value);
        if (isDict(value)) {
            registterOut[key] = value["serializedValue"];
        } else {
            registterOut[key] = value;
        }
    });
    //console.log("registterOut", registterOut);
    return registterOut;
}

export async function setBoxRegisterByteArray(box, register, str_value) {
    const value_Uint8Array = new TextEncoder().encode(str_value);
    box.set_register_value(register, (await ergolib).Constant.from_byte_array(value_Uint8Array));
}

export async function addSimpleOutputBox(outputCandidates, amountErgsFloat, payToAddress, creationHeight) {
    const amountNanoErgStr = Math.round((amountErgsFloat * NANOERG_TO_ERG)).toString();
    const amountBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(amountNanoErgStr));
    const outputBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        amountBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(payToAddress)),
        creationHeight);
    try {
        outputCandidates.add(outputBoxBuilder.build());
    } catch (e) {
        console.log(`building output error: ${e}`);
        throw e;
    }
}


export async function getTokens(tokenId, tokenAmount) {
    var tokens = new (await ergolib).Tokens();
    const _tokenId = (await ergolib).TokenId.from_str(tokenId);
    const _tokenAmount = (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(tokenAmount.toString()));
    tokens.add(new (await ergolib).Token(
        _tokenId,
        _tokenAmount)
    );
    return tokens;
}

export function getUtxosListValue(utxos) {
    return utxos.reduce((acc, utxo) => acc += BigInt(utxo.value), BigInt(0));
}

export function getTokenListFromUtxos(utxos) {
    var tokenList = {};
    for (const i in utxos) {
        for (const asset of utxos[i].assets) {
            if (Object.keys(tokenList).includes(asset.tokenId)) {
                tokenList[asset.tokenId] = BigInt(tokenList[asset.tokenId]) + BigInt(asset.amount);
            } else {
                //console.log("tokenList",tokenList, asset)
                tokenList[asset.tokenId] = BigInt(asset.amount);
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
    //console.log("getMissingTokens", inputs, outputs);
    const tokensIn = getTokenListFromUtxos(inputs);
    const tokensOut = getTokenListFromUtxos(outputs);
    var res = {};
    console.log("getMissingTokens", tokensIn, tokensOut);
    for (const token in tokensIn) {
        if (token in tokensOut) {
            if (tokensIn[token] - tokensOut[token] > 0) {
                res[token] = tokensIn[token] - tokensOut[token];
            }
        } else {
            res[token] = tokensIn[token];
        }
    }
    //console.log("getMissingTokens", tokensIn, tokensOut, res);
    return res;
}

export async function buildBalanceBox(inputs, outputs, address) {
    const missingErgs = getMissingErg(inputs, outputs).toString();
    const contract = await encodeContract(address);
    const tokens = buildTokenList(getMissingTokens(inputs, outputs));
    const height = await currentHeight();
    //console.log("buildBalanceBox", missingErgs, contract, tokens, height)

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
    for (const i in tokens) {
        res.push({ "tokenId": i, "amount": tokens[i].toString() });
    }
    return res;
}

export function getTokenAmount(box, tokenId) {
    var tokenAmount = "0";
    for (const asset of box.assets) {
        if (asset.tokenId === tokenId) {
            tokenAmount = asset.amount;
        }
    }
    return tokenAmount;
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

function isDict(v) {
    return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export async function getErgoStateContext() {
    const res = await getExplorerBlockHeaders();
    const block_headers = (await ergolib).BlockHeaders.from_json(res);
    const pre_header = (await ergolib).PreHeader.from_block_header(block_headers.get(0));
    return new (await ergolib).ErgoStateContext(pre_header, block_headers);
}

export async function getErgoStateContext2(contextId) {
    const res = await getExplorerBlockHeadersFull();
    //console.log("getErgoStateContext2", res);
    const explorerContext = res.slice(contextId, 10 + contextId);
    const block_headers = (await ergolib).BlockHeaders.from_json(explorerContext);
    const pre_header = (await ergolib).PreHeader.from_block_header(block_headers.get(0));
    return new (await ergolib).ErgoStateContext(pre_header, block_headers);
}

export async function signTransaction(unsignedTx, inputs, dataInputs, wallet) {
    //console.log("signTransaction1", unsignedTx, inputs, dataInputs);
    const unsignedTransaction = (await ergolib).UnsignedTransaction.from_json(JSONBigInt.stringify(unsignedTx));
    const inputBoxes = (await ergolib).ErgoBoxes.from_boxes_json(inputs);
    console.log("signTransaction dataInputs", dataInputs);
    try {
        const dataInputsBoxes = (await ergolib).ErgoBoxes.from_boxes_json(dataInputs);
        const ctx = await getErgoStateContext();
        const signedTx = wallet.sign_transaction(ctx, unsignedTransaction, inputBoxes, dataInputsBoxes);
        return signedTx.to_json();
    } catch (e) {
        console.log(e)
    }

}

// https://github.com/ergoplatform/eips/pull/37 ergopay:<txBase64safe>
export async function getTxReducedB64Safe(json, inputs, dataInputs = []) {
    //console.log("getTxReducedB64Safe", json, inputs, dataInputs);
    const [txId, reducedTx] = await getTxReduced(json, inputs, dataInputs);
    //console.log("getTxReducedB64Safe1", json, inputs, dataInputs);
    // Reduced transaction is encoded with Base64
    const txReducedBase64 = byteArrayToBase64(reducedTx.sigma_serialize_bytes());
    //console.log("getTxReducedB64Safe2", json, inputs, dataInputs);
    const ergoPayTx = txReducedBase64.replace(/\//g, '_').replace(/\+/g, '-');
    //console.log("getTxReducedB64Safe3", txId, ergoPayTx);
    // split by chunk of 1000 char to generates the QR codes

    return [txId, ergoPayTx];
}

async function getTxReduced(json, inputs, dataInputs) {
    // build ergolib objects from json
    //console.log("getTxReduced", json, inputs, dataInputs);
    const unsignedTx = (await ergolib).UnsignedTransaction.from_json(JSONBigInt.stringify(json));
    const inputBoxes = (await ergolib).ErgoBoxes.from_boxes_json(inputs);
    const inputDataBoxes = (await ergolib).ErgoBoxes.from_boxes_json(dataInputs);
    const ctx = await getErgoStateContext();
    return [unsignedTx.id().to_str(), (await ergolib).ReducedTransaction.from_unsigned_tx(unsignedTx, inputBoxes, inputDataBoxes, ctx)];
}