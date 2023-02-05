import { errorAlert, waitingAlert } from "../utils/Alerts";
import { encodeHexArrayConst, encodeHexConst, encodeLongArray, encodeStrConst } from "../ergo-related/serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, OPTION_TYPES } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "../ergo-related/wallet";
import { boxById, currentHeight, getTokenInfo } from "../ergo-related/explorer";
import { createTransaction } from "../ergo-related/wasm";
import JSONBigInt from 'json-bigint';
import { EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS } from "../utils/script_constants";
import { ergolib } from "./BuyRequestActions";
import { OptionDef } from "../objects/OptionDef";

/* global BigInt */

export async function createOptionRequest(optionType, optionStyle, underlyingTokenId, optionAmount, shareSize, strikePrice, maturityDate, txFee) {
    var alert = waitingAlert("Preparing the transaction...");
    const maturityDateUNIX = maturityDate.valueOf();
    console.log("maturityDate", maturityDate.toISOString().substring(0, 10), maturityDateUNIX);
    const underlyingToken = await getTokenInfo(underlyingTokenId);
    console.log("underlyingToken",underlyingToken, underlyingToken?.status)
    if (underlyingToken?.status === 404) {
        alert = errorAlert("Token not found, ID: " + underlyingTokenId)
        return;
    }

    const address = localStorage.getItem('address');
    const optionAmountRaw = optionAmount * Math.pow(10, underlyingToken.decimals);
    const strikePriceRaw = Math.floor(strikePrice / Math.pow(10, underlyingToken.decimals));
    const mintFee = DAPP_UI_MINT_FEE + Math.floor(optionAmountRaw * strikePriceRaw * shareSize * DAPP_UI_FEE / 1000);
    var txAmount = 4 * txFee + 2 * MIN_NANOERG_BOX_VALUE + mintFee;

    if (optionType === 1) { // Put reserve
        txAmount = txAmount + optionAmountRaw * strikePriceRaw * shareSize;
    }
    const optionBoxValue = txAmount - txFee;

    var utxos = await getUtxos(txAmount);
    const requiredTokenAmount = optionAmountRaw * shareSize;
    if (optionType === 0) { // Call reserve
        const utxos1 = await getTokenUtxos(requiredTokenAmount, underlyingToken.id);
        utxos = utxos.concat(utxos1).filter((value, index, self) => index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;

    }
    console.log("requiredTokenAmount", requiredTokenAmount);

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionBoxValue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(OPTION_SCRIPT_ADDRESS)),
        //(await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address)),
        creationHeight);
    if (optionType === 0) { // Call reserve
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(underlyingToken.id),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredTokenAmount.toString()))
        );
    }
    var optionStyleLetter = 'E';
    if (optionStyle === 1) {
        optionStyleLetter = 'A';
    }
    var optionTypeText = OPTION_TYPES.find(o => o.id === optionType).label;

    const optionName = optionTypeText + "_" + optionStyleLetter + "_" + underlyingToken.name + "_ERG_" + strikePrice + "_" + maturityDate.toISOString().substring(0, 10) + "_per_" + shareSize;
    console.log("optionName", optionName);
    mintBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
    mintBoxBuilder.set_register_value(5, await encodeHexConst(underlyingToken.id));
    mintBoxBuilder.set_register_value(6, await encodeStrConst(underlyingToken.decimals.toString()));

    const box = await boxById("84844f06f3dc31e92770376ccd2b2e47f218c9666d9fef7f5421040c75f83ad7"); // small box with R4, R5, R6 Call[Byte], R7 Box
    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
    mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));

    const optionParams = [optionType, optionStyle, shareSize, maturityDateUNIX, strikePriceRaw, mintFee, txFee];
    console.log("optionParams", optionParams);
    mintBoxBuilder.set_register_value(8, await encodeLongArray(optionParams.map(x => x.toString())));

    const ECPointByteArray = (await ergolib).Address.from_base58(address).content_bytes();
    const ECPointHex = Buffer.from(ECPointByteArray).toString('hex');
    //const test = Buffer.from(ECPointByteArray).toString('hex')
    //console.log("issuerErgoTreeHex", test, DAPP_UI_ERGOTREE)
    //const test2 = (await ergolib).Constant.from_ecpoint_bytes(ECPointByteArray);
    //console.log("test2", test2.encode_to_base16());
    //
    //console.log("test22", (await ergolib).Address.p2pk_from_pk_bytes(ECPointByteArray).to_base58())
    const R9Array = await encodeHexArrayConst([ECPointHex, DAPP_UI_ERGOTREE]);
    mintBoxBuilder.set_register_value(9, R9Array);

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, txFee);
    console.log("create option request tx", tx);
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}


export async function refundOptionRequest(requestBox) {
    console.log("refundOptionRequest requestBox", requestBox)
    const alert = waitingAlert("Preparing the transaction...");
    const address = localStorage.getItem('address');
    const optionDef = await OptionDef.create(requestBox);
    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - optionDef.txFee).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        refundBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address)),
        creationHeight);
    for (const tok of requestBox.assets) {
        const underlyingTokenAmount = BigInt(parseInt(tok.amount));
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(tok.tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenAmount.toString()))
        );
    }

    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(requestBox));
    mintBoxBuilder.set_register_value(4, boxWASM.register_value(4));
    mintBoxBuilder.set_register_value(5, boxWASM.register_value(5));
    mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
    mintBoxBuilder.set_register_value(7, boxWASM.register_value(7));
    mintBoxBuilder.set_register_value(8, boxWASM.register_value(8));
    mintBoxBuilder.set_register_value(9, boxWASM.register_value(9));
    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox], optionDef.txFee);
    console.log("create option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}



export async function exerciseOptionRequest(optionTokenID, optionAmount) {
    const alert = waitingAlert("Preparing the transaction...");
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);
    console.log("exerciseOptionRequest optionDef", optionDef);
    const address = localStorage.getItem('address');
    var requestBoxValue = BigInt(optionDef.txFee) + BigInt(2 * MIN_NANOERG_BOX_VALUE);
    var underlyingTokenInfo = await getTokenInfo(optionDef.underlyingTokenId);
    const optionRawAmount = BigInt(optionAmount) * BigInt(Math.pow(10, underlyingTokenInfo.decimals));
    if (optionDef.optionType === 0) { // Call
        requestBoxValue = requestBoxValue + optionRawAmount * BigInt(optionDef.strikePrice * optionDef.shareSize)
    }
    //requestBoxValue = maxBigInt(requestBoxValue, BigInt(optionDef.txFee) + BigInt(2 * MIN_NANOERG_BOX_VALUE))
    console.log("requestBoxValue", requestBoxValue);
    console.log("optionTokenRawAmount", optionRawAmount);
    var utxos = await getUtxos(BigInt(optionDef.txFee) + requestBoxValue);
    var utxos1 = await getTokenUtxos(optionRawAmount, optionTokenID)
    utxos = utxos.concat(utxos1).filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;

    const underlyingTokenRawAmount = BigInt(optionRawAmount) * BigInt(optionDef.shareSize);
    console.log("underlyingTokenRawAmount", underlyingTokenRawAmount);
    if (optionDef.optionType === 1) { // Put
        var utxos2 = await getTokenUtxos(underlyingTokenRawAmount, optionDef.underlyingTokenId)
        utxos = utxos.concat(utxos2).filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.boxId === value.boxId
            )));;
    }

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(requestBoxValue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS)),
        creationHeight);
    const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    );
    mintBoxBuilder.add_token( // option tokens
        (await ergolib).TokenId.from_str(optionTokenID),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionRawAmount.toString())),
    );
    if (optionDef.optionType === 1) { // Put
        mintBoxBuilder.add_token( // underlying tokens
            (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenRawAmount.toString())),
        );
    }
    mintBoxBuilder.set_register_value(4, buyerSigmaProp);
    const optionIssuerBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionIssuerBox));
    mintBoxBuilder.set_register_value(5, (await ergolib).Constant.from_ergo_box(optionIssuerBoxWASM));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, optionDef.txFee);
    console.log("create but option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}
