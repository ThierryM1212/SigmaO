import { waitingAlert, displayTransaction } from "../utils/Alerts";
import { encodeHexConst, encodeLong, encodeLongArray, encodeStrConst, ergoTreeToAddress, sigmaPropToAddress } from "./serializer";
import { BUY_OPTION_REQUEST_SCRIPT_ADDRESS, DAPP_UI_ERGOTREE, DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, OPTION_TYPES, TX_FEE, UNDERLYING_TOKENS } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "./wallet";
import { boxById, boxByTokenId, currentHeight, searchUnspentBoxesUpdated, sendTx } from "./explorer";
import { createTransaction, signTransaction } from "./wasm";
import { maxBigInt } from "../utils/utils";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../utils/OptionDef";
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export async function createOptionRequest(optionType, optionStyle, underlyingToken, optionAmount, shareSize, strikePrice, maturityDate, sigma, K1, K2) {
    const alert = waitingAlert("Preparing the transaction...");
    const maturityDateUNIX = maturityDate.valueOf();
    console.log("maturityDate", maturityDate.toISOString().substring(0, 10), maturityDateUNIX);

    const address = localStorage.getItem('address');
    var txAmount = 3 * TX_FEE + MIN_NANOERG_BOX_VALUE + DAPP_UI_MINT_FEE;

    if (optionType === 1) { // Put reserve
        txAmount = txAmount + optionAmount * optionAmount * strikePrice;
    }
    const optionBoxValue = txAmount - TX_FEE;

    var utxos = await getUtxos(txAmount);
    const requiredTokenAmount = optionAmount * shareSize * Math.pow(10, underlyingToken.decimals) + 1; // one to stay in the option box
    if (optionType === 0) { // Call reserve
        const utxos1 = await getTokenUtxos(requiredTokenAmount, underlyingToken.tokenId);
        utxos = utxos.concat(utxos1).filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.boxId === value.boxId
            )));;
    }

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
    if (optionType === 0) { // Call reserve
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(underlyingToken.tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredTokenAmount.toString()))
        );
    }
    var optionStyleLetter = 'E';
    if (optionStyle === 1) {
        optionStyleLetter = 'A';
    }
    var optionTypeText = OPTION_TYPES.find(o => o.id === optionType).label;

    const optionName = optionTypeText + "_" + optionStyleLetter + "_" + underlyingToken.label + "_ERG_" + strikePrice + "_" + maturityDate.toISOString().substring(0, 10) + "_per_" + shareSize;
    mintBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
    mintBoxBuilder.set_register_value(5, await encodeHexConst(DAPP_UI_ERGOTREE));
    mintBoxBuilder.set_register_value(6, await encodeStrConst("0"));

    const box = await boxById("a4577000af55f79df12e097a937b08fa8a2fc5292fce00acd3bad8d962139f71"); // random small box
    const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
    mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));

    const optionParams = [optionType, optionStyle, shareSize, maturityDateUNIX, sigma, K1, K2, strikePrice, DAPP_UI_FEE, DAPP_UI_MINT_FEE];
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
    const optionDef = await OptionDef.create(requestBox);
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

    // Compute number minted options
    var numMintedOptionTokens = 0, underlyingTokenAmount = 0;
    if (optionDef.optionType === 0) { // Call reserve
        underlyingTokenAmount = BigInt(parseInt(requestBox.assets[0].amount));
        numMintedOptionTokens = underlyingTokenAmount / (BigInt(optionDef.shareSize) * BigInt(Math.pow(10, optionToken.decimals))) + BigInt(1);
    } else { // Put reserve (ERG)
        numMintedOptionTokens = BigInt(requestBox.value - 2 * TX_FEE - DAPP_UI_MINT_FEE - MIN_NANOERG_BOX_VALUE) / BigInt(optionDef.shareSize * optionDef.strikePrice) + BigInt(1);
    }

    // Add minted option tokens
    mintBoxBuilder.add_token(
        (await ergolib).TokenId.from_box_id((await ergolib).BoxId.from_str(requestBox.boxId)),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str((numMintedOptionTokens.toString())))
    );
    // Add reserve tokens for Call options
    if (optionDef.optionType === 0) { // Call reserve
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(requestBox.assets[0].tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(underlyingTokenAmount.toString()))
        );
    }
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

    // dApp Mint fee box
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
    const optionReserveBoxes = await searchUnspentBoxesUpdated(optionScriptAddress, [optionTokenID]);
    console.log("optionReserveBoxes", optionReserveBoxes)
    const validOptionReserveBoxes = optionReserveBoxes.filter(opt => opt.assets[0].amount >= optionBuyAmount && opt.assets[0].tokenId === optionTokenID);
    const utxos = [validOptionReserveBoxes[0], box];
    console.log("utxos", utxos)
    const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(validOptionReserveBoxes[0]));

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

    // rebuild the option reserve
    const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        reserveBoxWASM.value(), // unchanged
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionScriptAddress)),
        creationHeight);
    const initialReserveOptionAmount = reserveBoxWASM.tokens().get(0).amount().as_i64().to_str();
    const outputReserveOptionAmount = BigInt(initialReserveOptionAmount) - BigInt(optionBuyAmount);
    optionReserveBoxBuilder.add_token( // option token sold
        reserveBoxWASM.tokens().get(0).id(),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveOptionAmount.toString())),
    );
    if (optionDef.optionType === 0) { // Call token reserve
        optionReserveBoxBuilder.add_token( // underlying token unchanged
            reserveBoxWASM.tokens().get(1).id(),
            reserveBoxWASM.tokens().get(1).amount(),
        );
    }

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
        reserveBoxWASM.tokens().get(0).id(),
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
    const optionReserveBoxes = await searchUnspentBoxesUpdated(optionScriptAddress, [optionTokenID]);
    const utxos = [optionReserveBoxes[0], box];
    console.log("utxos", utxos)
    const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionReserveBoxes[0]));
    const underlyingTokenDecimals = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).decimals;
    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

    var outputReserveValue = parseInt(optionReserveBoxes[0].value);
    if (optionDef.optionType === 1) { // Put option reserve updated
        outputReserveValue = outputReserveValue - optionBuyAmount * optionDef.shareSize * optionDef.strikePrice;
    }

    // rebuild the option reserve
    const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(outputReserveValue.toString())),
        //new (await ergolib).Contract(reserveBoxWASM.ergo_tree()),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionScriptAddress)),
        creationHeight);

    optionReserveBoxBuilder.add_token( // option token unchanged
        reserveBoxWASM.tokens().get(0).id(),
        reserveBoxWASM.tokens().get(0).amount(),
    );

    const requiredUnderlyingTokenAmount = BigInt(optionBuyAmount * optionDef.shareSize * Math.pow(10, underlyingTokenDecimals))
    if (optionDef.optionType === 0) { // Call option reserve updated
        const initialReserveTokenAmount = reserveBoxWASM.tokens().get(1).amount().as_i64().to_str();
        const outputReserveTokenAmount = BigInt(initialReserveTokenAmount) - requiredUnderlyingTokenAmount;
        optionReserveBoxBuilder.add_token( // underlying token
            (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveTokenAmount.toString())),
        );
    } else { // Put token change
        const providedUnderlyingTokenAmount = BigInt(box.assets[1].amount);
        if (providedUnderlyingTokenAmount - requiredUnderlyingTokenAmount > 0) {
            optionReserveBoxBuilder.add_token( // underlying token
                (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str((providedUnderlyingTokenAmount - requiredUnderlyingTokenAmount).toString())),
            );
        }
    }

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

    // Exerciser delivery box
    const initialRequestValue = BigInt(box.value);
    var issuerPayBoxValue = BigInt(0), exerciseDeliveryBoxValue = BigInt(0);
    if (optionDef.optionType === 0) { // Call option deliver token
        issuerPayBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionBuyAmount) * BigInt(optionDef.strikePrice * optionDef.shareSize));
        exerciseDeliveryBoxValue = initialRequestValue - BigInt(TX_FEE) - issuerPayBoxValue;
    } else { // Put deliver ERG
        exerciseDeliveryBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionBuyAmount * optionDef.shareSize * optionDef.strikePrice));
        issuerPayBoxValue = BigInt(MIN_NANOERG_BOX_VALUE);
    }

    console.log("exerciseDeliveryBoxValue", exerciseDeliveryBoxValue, initialRequestValue, issuerPayBoxValue)
    const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(exerciseDeliveryBoxValue.toString())),
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionBuyerAddress)),
        creationHeight);
    if (optionDef.optionType === 0) { // Call deliver tokens
        optionDeliveryBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredUnderlyingTokenAmount.toString())),
        );
    }
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
    if (optionDef.optionType === 1) { // Put pay tokens
        issuerPayBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredUnderlyingTokenAmount.toString())),
        );
    }
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
    displayTransaction(txId);
    return txId;
}

export async function exerciseOptionRequest(optionTokenID, optionAmount) {
    const alert = waitingAlert("Preparing the transaction...");
    const optionIssuerBox = await boxById(optionTokenID);
    const optionDef = await OptionDef.create(optionIssuerBox);

    const address = localStorage.getItem('address');
    var requestBoxValue = BigInt(TX_FEE) + BigInt(MIN_NANOERG_BOX_VALUE);
    if (optionDef.optionType === 0) { // Call
        requestBoxValue = requestBoxValue + BigInt(optionAmount * optionDef.strikePrice * optionDef.shareSize)
    }
    const exerciseRequestAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).exerciseOptionScriptAddress;

    var utxos = await getUtxos(BigInt(TX_FEE) + requestBoxValue);
    var utxos1 = await getTokenUtxos(optionAmount, optionTokenID)
    utxos = utxos.concat(utxos1).filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;
    const putUnderlyingTokenAmount = BigInt(optionAmount) * BigInt(optionDef.shareSize);
    const underlyingTokenDecimals = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).decimals;
    if (optionDef.optionType === 1) { // Put
        var utxos2 = await getTokenUtxos(putUnderlyingTokenAmount, optionDef.underlyingTokenId)
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
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(exerciseRequestAddress)),
        creationHeight);
    const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    );
    mintBoxBuilder.add_token( // option tokens
        (await ergolib).TokenId.from_str(optionTokenID),
        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionAmount.toString())),
    );
    if (optionDef.optionType === 1) { // Put
        mintBoxBuilder.add_token( // option tokens
            (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str((putUnderlyingTokenAmount * BigInt(Math.pow(10, underlyingTokenDecimals))).toString())),
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
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("create but option request tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    return txId;
}


export async function closeOptionExpired(box, issuerAddress) {
    const alert = waitingAlert("Preparing the transaction...");

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([box]);

    const inputWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
    const optionIssuerBox = await boxById(box.assets[0].tokenId);
    const optionDef = await OptionDef.create(optionIssuerBox);

    const useroutputvalue = box.value - TX_FEE;

    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(useroutputvalue.toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(issuerAddress)),
        creationHeight);
    if (optionDef.optionType === 0) { // Call return reserve tokens
        mintBoxBuilder.add_token( // underlying token
            inputWASM.tokens().get(1).id(),
            inputWASM.tokens().get(1).amount(),
        );
    }

    mintBoxBuilder.set_register_value(4, inputWASM.register_value(4));
    mintBoxBuilder.set_register_value(5, inputWASM.register_value(5));
    mintBoxBuilder.set_register_value(6, inputWASM.register_value(6));
    mintBoxBuilder.set_register_value(7, inputWASM.register_value(7));

    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], issuerAddress, [box], true);
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    const signedTx = JSONBigInt.parse(await signTransaction(tx, [box], [], wallet));
    const txId = await sendTx(signedTx);
    displayTransaction(txId);
    return txId;
}





export async function test() {
    // mint SQRT box
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
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58("2fp8i8rY9B2Fs91NZD5vncK")),
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

    mintBoxBuilder.set_register_value(4, SQRTWASM2);


    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }
    var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos);
    console.log("mintOption tx", tx)
    const txId = await walletSignTx(alert, tx, address);
    displayTransaction(txId);
    return txId;
}