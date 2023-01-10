import { waitingAlert, displayTransaction } from "../utils/Alerts";
import { encodeHexArrayConst, encodeHexConst, encodeLong, encodeLongArray, encodeStrConst, ergoTreeToAddress, sigmaPropToAddress } from "./serializer";
import { BUY_OPTION_REQUEST_SCRIPT_ADDRESS, CYTI_MINT_REQUEST_SCRIPT_ADDRESS, DAPP_UI_ERGOTREE, DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, NANOERG_TO_ERG, NFT_TYPES, TX_FEE, UNDERLYING_TOKENS } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "./wallet";
import { Serializer } from "@coinbarn/ergo-ts";
import { boxById, boxByTokenId, currentHeight, getExplorerBlockHeaders, getOraclePrice, searchUnspentBoxesUpdated, sendTx } from "./explorer";
import { createTransaction, getErgoStateContext, getUtxosListValue, signTransaction } from "./wasm";
import { downloadAndSetSHA256, maxBigInt } from "../utils/utils";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../utils/OptionDef";
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export async function createOptionRequest(optionType, underlyingToken, optionAmount, shareSize, strikePrice, maturityDate, sigma, K1, K2) {
    const alert = waitingAlert("Preparing the transaction...");
    const maturityDateUNIX = maturityDate.valueOf();
    console.log("maturityDate", maturityDate.toISOString().substring(0, 10), maturityDateUNIX);

    const address = localStorage.getItem('address');
    const txAmount = 3 * TX_FEE + MIN_NANOERG_BOX_VALUE + DAPP_UI_MINT_FEE;
    const optionBoxValue = txAmount - TX_FEE;

    var utxos = await getUtxos(txAmount);
    const requiredTokenAmount = optionAmount * shareSize * Math.pow(10, underlyingToken.decimals) + 1; // one to stay in the option box
    const utxos1 = await getTokenUtxos(requiredTokenAmount, underlyingToken.tokenId);
    utxos = utxos.concat(utxos1).filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;
    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionBoxValue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(underlyingToken.optionScriptAddress)),
        //(await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address)),
        creationHeight);
    mintBoxBuilder.add_token(
        (await ergolib).TokenId.from_str(underlyingToken.tokenId),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredTokenAmount.toString()))
    );
    var optionTypeLetter = 'E';
    if (optionType === 1) {
        optionTypeLetter = 'A';
    }

    const optionName = "CALL_" + optionTypeLetter + "_" + underlyingToken.label + "_ERG_" + strikePrice + "_" + maturityDate.toISOString().substring(0, 10) + "_per_" + shareSize;
    mintBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
    mintBoxBuilder.set_register_value(5, await encodeHexConst(DAPP_UI_ERGOTREE));
    mintBoxBuilder.set_register_value(6, await encodeStrConst("0"));

    const box = await boxById("a4577000af55f79df12e097a937b08fa8a2fc5292fce00acd3bad8d962139f71"); // random small box
    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
    mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));

    const optionParams = [optionType, shareSize, maturityDateUNIX, sigma, K1, K2, strikePrice, DAPP_UI_FEE, DAPP_UI_MINT_FEE];
    mintBoxBuilder.set_register_value(8, await encodeLongArray(optionParams.map(x => x.toString())));

    const issuerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    );
    mintBoxBuilder.set_register_value(9, issuerSigmaProp);

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("create option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}


export async function mintOption(requestBox) {
    console.log("mintOption requestBox", requestBox)
    const address = localStorage.getItem('address');
    const optionParams = JSONBigInt.parse(requestBox.additionalRegisters.R8.renderedValue);
    const optionToken = UNDERLYING_TOKENS.find(tok => tok.optionScriptAddress === requestBox.address)

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - TX_FEE - DAPP_UI_MINT_FEE).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(requestBox.address)),
        creationHeight);
    const underlyingTokenAmount = BigInt(parseInt(requestBox.assets[0].amount));
    const optionShareSize = BigInt(optionParams[1]);
    const numMintedOptionTokens = underlyingTokenAmount / (optionShareSize * BigInt(Math.pow(10, optionToken.decimals))) + BigInt(1);
    mintBoxBuilder.add_token(
        (await ergolib).TokenId.from_str(requestBox.assets[0].tokenId),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenAmount.toString()))
    );
    mintBoxBuilder.add_token(
        (await ergolib).TokenId.from_box_id((await ergolib).BoxId.from_str(requestBox.boxId)),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str((numMintedOptionTokens.toString())))
    );
    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(requestBox));
    mintBoxBuilder.set_register_value(4, boxWASM.register_value(4));
    mintBoxBuilder.set_register_value(5, await encodeStrConst("0"));
    mintBoxBuilder.set_register_value(6, await encodeStrConst("0"));
    mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    const dAppMintFeeValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(DAPP_UI_MINT_FEE.toString()));
    const dAppMintFeeBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        dAppMintFeeValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(await ergoTreeToAddress(DAPP_UI_ERGOTREE))),
        creationHeight);
    try {
        outputCandidates.add(dAppMintFeeBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox]);
    console.log("create option request tx", tx)
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    const signedTx = await signTransaction(tx, [requestBox], [], wallet);
    const txId = await sendTx(JSONBigInt.parse(signedTx));
    displayTransaction(txId);
    return txId;
}

export async function refundOptionRequest(requestBox) {
    console.log("refundOptionRequest requestBox", requestBox)
    const alert = waitingAlert("Preparing the transaction...");
    const address = localStorage.getItem('address');

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - TX_FEE).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        refundBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address)),
        creationHeight);
    const underlyingTokenAmount = BigInt(parseInt(requestBox.assets[0].amount));
    mintBoxBuilder.add_token(
        (await ergolib).TokenId.from_str(requestBox.assets[0].tokenId),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenAmount.toString()))
    );
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
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox]);
    console.log("create option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}


export async function buyOptionRequest(optionTokenID, optionAmount, optionMaxPrice) {
    console.log("buyOptionRequest ", optionTokenID, optionAmount, optionMaxPrice)

    const alert = waitingAlert("Preparing the transaction...");
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);

    const address = localStorage.getItem('address');
    const optionPrice = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionAmount) * BigInt(optionMaxPrice));
    const dAppFee = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), optionPrice * BigInt(optionDef.dAppUIFee) / BigInt(1000));
    const requestBoxValue = BigInt(TX_FEE) + optionPrice + dAppFee + BigInt(MIN_NANOERG_BOX_VALUE);

    var utxos = await getUtxos(requestBoxValue + BigInt(TX_FEE));

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(requestBoxValue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(BUY_OPTION_REQUEST_SCRIPT_ADDRESS)),
        creationHeight);
    const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    );
    mintBoxBuilder.set_register_value(4, buyerSigmaProp);
    mintBoxBuilder.set_register_value(5, await encodeHexConst(optionTokenID));
    mintBoxBuilder.set_register_value(6, await encodeLong(optionAmount.toString()));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("create but option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}

export async function refundBuyRequest(requestBox) {
    console.log("refundBuyRequest", requestBox);
    const alert = waitingAlert("Preparing the transaction...");
    const address = localStorage.getItem('address');

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - TX_FEE).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        refundBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address)),
        creationHeight);
    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(requestBox));
    mintBoxBuilder.set_register_value(4, boxWASM.register_value(4));
    mintBoxBuilder.set_register_value(5, boxWASM.register_value(5));
    //mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
    if (boxWASM.tokens().len() > 0) {
        for (var tok = 0; tok < boxWASM.tokens().len(); tok++) {
            const tokWASM = boxWASM.tokens().get(tok);
            mintBoxBuilder.add_token(tokWASM.id(), tokWASM.amount());
        }
    }
    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox]);
    console.log("create option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}


export async function processBuyRequest(box) {
    console.log("processBuyRequest", box);
    const alert = waitingAlert("Preparing the transaction...");
    const address = localStorage.getItem('address');
    const optionTokenID = box.additionalRegisters.R5.renderedValue;
    const optionBuyAmount = box.additionalRegisters.R6.renderedValue;
    const optionBuyerAddress = await sigmaPropToAddress(box.additionalRegisters.R4.serializedValue);
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);
    console.log("optionDef", optionDef)
    const optionScriptAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).optionScriptAddress;
    const optionReserveBoxes = await searchUnspentBoxesUpdated(optionScriptAddress, [optionTokenID, optionDef.underlyingTokenId]);
    const validOptionReserveBoxes = optionReserveBoxes.filter(opt => opt.assets[1].amount > optionBuyAmount && opt.assets[1].tokenId === optionTokenID);
    const utxos = [validOptionReserveBoxes[0], box];
    const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(validOptionReserveBoxes[0]));

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();



    // rebuild the option reserve
    const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        reserveBoxWASM.value(),
        //new (await ergolib).Contract(reserveBoxWASM.ergo_tree()),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionScriptAddress)),
        creationHeight);
    optionReserveBoxBuilder.add_token( // underlying token unchanged
        reserveBoxWASM.tokens().get(0).id(),
        reserveBoxWASM.tokens().get(0).amount(),
    );
    const initialReserveOptionAmount = reserveBoxWASM.tokens().get(1).amount().as_i64().to_str();
    const outputReserveOptionAmount = BigInt(initialReserveOptionAmount) - BigInt(optionBuyAmount);
    optionReserveBoxBuilder.add_token( // underlying token unchanged
        reserveBoxWASM.tokens().get(1).id(),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveOptionAmount.toString())),
    );
    optionReserveBoxBuilder.set_register_value(4, reserveBoxWASM.register_value(4));
    optionReserveBoxBuilder.set_register_value(5, reserveBoxWASM.register_value(5));
    optionReserveBoxBuilder.set_register_value(6, reserveBoxWASM.register_value(6));
    optionReserveBoxBuilder.set_register_value(7, reserveBoxWASM.register_value(7));
    try {
        outputCandidates.add(optionReserveBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // option delivery box
    const initialRequestValue = BigInt(box.value);
    const optionValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionBuyAmount) * BigInt(optionDef.currentOptionPrice));
    const dAppFee = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), (optionValue * BigInt(optionDef.dAppUIFee)) / BigInt(1000));
    const optionDeliveryBoxValue = initialRequestValue - BigInt(TX_FEE) - optionValue - dAppFee;
    console.log("optionDeliveryBoxValue", optionDeliveryBoxValue, initialRequestValue, optionValue, dAppFee)

    const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionDeliveryBoxValue.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionBuyerAddress)),
        creationHeight);
    optionDeliveryBoxBuilder.add_token( // option
        reserveBoxWASM.tokens().get(1).id(),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionBuyAmount.toString())),
    );
    try {
        outputCandidates.add(optionDeliveryBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // Issuer pay box
    const issuerPayBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionValue.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionDef.issuerAddress)),
        creationHeight);
    try {
        outputCandidates.add(issuerPayBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // dApp UI Fee
    const dAppUIFeeBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(dAppFee.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionDef.dAppUIAddress)),
        creationHeight);
    try {
        outputCandidates.add(dAppUIFeeBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // Oracle box
    const oracleBoxes = await boxByTokenId(UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).oracleNFTID)

    const tx = await createTransaction(boxSelection, outputCandidates, [oracleBoxes[0]], address, utxos);
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    const signedTx = JSONBigInt.parse(await signTransaction(tx, utxos, [oracleBoxes[0]], wallet));
    const txId = await sendTx(signedTx);
    displayTransaction(txId)
    return txId;
}


export async function processExerciseRequest(box) {
    console.log("processExerciseRequest", box);
    const alert = waitingAlert("Preparing the transaction...");
    const address = localStorage.getItem('address');
    const optionTokenID = box.assets[0].tokenId;
    const optionBuyerAddress = await sigmaPropToAddress(box.additionalRegisters.R4.serializedValue);
    const optionBuyAmount = box.assets[0].amount;
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);
    console.log("optionDef", optionDef)
    const optionScriptAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).optionScriptAddress;
    const optionReserveBoxes = await searchUnspentBoxesUpdated(optionScriptAddress, [optionTokenID, optionDef.underlyingTokenId]);
    const utxos = [optionReserveBoxes[0], box];
    const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionReserveBoxes[0]));

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

    // rebuild the option reserve
    const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        reserveBoxWASM.value(),
        //new (await ergolib).Contract(reserveBoxWASM.ergo_tree()),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionScriptAddress)),
        creationHeight);
    const initialReserveOptionAmount = reserveBoxWASM.tokens().get(0).amount().as_i64().to_str();
    const underlyingTokenDecimals = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).decimals;
    const underlyingTokenAmount = BigInt(optionBuyAmount * optionDef.shareSize * Math.pow(10, underlyingTokenDecimals));
    const outputReserveOptionAmount = BigInt(initialReserveOptionAmount) - underlyingTokenAmount;
    optionReserveBoxBuilder.add_token( // underlying token
        reserveBoxWASM.tokens().get(0).id(),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveOptionAmount.toString())),
    );
    optionReserveBoxBuilder.add_token( // option token unchanged
        reserveBoxWASM.tokens().get(1).id(),
        reserveBoxWASM.tokens().get(1).amount(),
    );
    optionReserveBoxBuilder.set_register_value(4, reserveBoxWASM.register_value(4));
    optionReserveBoxBuilder.set_register_value(5, reserveBoxWASM.register_value(5));
    optionReserveBoxBuilder.set_register_value(6, reserveBoxWASM.register_value(6));
    optionReserveBoxBuilder.set_register_value(7, reserveBoxWASM.register_value(7));
    try {
        outputCandidates.add(optionReserveBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // token delivery box
    const initialRequestValue = BigInt(box.value);
    const issuerPayBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionBuyAmount) * BigInt(optionDef.strikePrice * optionDef.shareSize));
    const optionDeliveryBoxValue = initialRequestValue - BigInt(TX_FEE) - issuerPayBoxValue;
    console.log("optionDeliveryBoxValue", optionDeliveryBoxValue, initialRequestValue, issuerPayBoxValue)

    const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionDeliveryBoxValue.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionBuyerAddress)),
        creationHeight);
    optionDeliveryBoxBuilder.add_token( // option
        reserveBoxWASM.tokens().get(0).id(),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenAmount.toString())),
    );
    try {
        outputCandidates.add(optionDeliveryBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // Issuer pay box
    const issuerPayBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(issuerPayBoxValue.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionDef.issuerAddress)),
        creationHeight);
    try {
        outputCandidates.add(issuerPayBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    const tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, true);
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    const signedTx = JSONBigInt.parse(await signTransaction(tx, utxos, [], wallet));
    const txId = await sendTx(signedTx);
    alert.close();
    return txId;
}

export async function exerciseOptionRequest(optionTokenID, optionAmount) {

    const alert = waitingAlert("Preparing the transaction...");
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);

    const address = localStorage.getItem('address');
    const requestBoxValue = BigInt(TX_FEE) + BigInt(MIN_NANOERG_BOX_VALUE) + BigInt(optionAmount * optionDef.strikePrice * optionDef.shareSize);
    const exerciseRequestAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).exerciseOptionScriptAddress;

    var utxos = await getUtxos(BigInt(TX_FEE) + requestBoxValue);
    var utxos1 = await getTokenUtxos(optionAmount, optionTokenID)
    utxos = utxos.concat(utxos1).filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(requestBoxValue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(exerciseRequestAddress)),
        creationHeight);
    const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    );
    mintBoxBuilder.add_token( // underlying token
        (await ergolib).TokenId.from_str(optionTokenID),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionAmount.toString())),
    );
    mintBoxBuilder.set_register_value(4, buyerSigmaProp);
    const optionIssuerBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionIssuerBox));
    mintBoxBuilder.set_register_value(5, (await ergolib).Constant.from_ergo_box(optionIssuerBoxWASM));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("create but option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}










export async function test() {
    const alert = waitingAlert("Preparing the transaction...");


    const address = localStorage.getItem('address');
    const txAmount = 2 * TX_FEE + MIN_NANOERG_BOX_VALUE;

    var utxos = await getUtxos(txAmount);
    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((TX_FEE + MIN_NANOERG_BOX_VALUE).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58("28JUQYcEdDNppFaPww1")),
        creationHeight);

    const SQRT = [
        ["0", "0"],
        ["3600000", "1897"],
        ["14400000", "3795"],
        ["86400000", "9295"],
        ["172800000", "13145"],
        ["432000000", "20785"],
        ["864000000", "29394"],
        ["1728000000", "41569"],
        ["2592000000", "50912"],
        ["5184000000", "72000"],
        ["12960000000", "113842"],
        ["20736000000", "144000"],
        ["31536000000", "177584"],
        ["47304000000", "217495"],
        ["63072000000", "251141"],
        ["94608000000", "307584"],
    ];

    const SQRTWASM = await Promise.all(SQRT.map(async jstuple => (await ergolib).array_as_tuple(jstuple)));
    const SQRTWASM2 = (await ergolib).Constant.from_js(SQRTWASM);
    console.log("SQRTWASM2", SQRTWASM2.dbg_inner())
    return;
    //const issuerErgoTree = (await ergolib).Address.from_base58(address).to_ergo_tree().to_base16_bytes();
    const issuerErgoTree = (await ergolib).Address.from_base58(address).content_bytes();
    mintBoxBuilder.set_register_value(4, (await ergolib).Constant.from_byte_array(issuerErgoTree));
    //const issuerSigmaProp2 =(await ergolib).Constant.from_ecpoint_bytes(
    //    (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    //).encode_to_base16();
    console.log(issuerErgoTree);

    mintBoxBuilder.set_register_value(4, await encodeHexConst(issuerErgoTree));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("mintOption tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}