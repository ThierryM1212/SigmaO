import { waitingAlert, displayTransaction } from "../utils/Alerts";
import { encodeHexConst, encodeLong, encodeLongArray, encodeStrConst, ergoTreeToAddress, sigmaPropToAddress } from "./serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, OPTION_TYPES, TX_FEE } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "./wallet";
import { boxById, boxByIdv1, boxByIdv2, boxByTokenId, boxByTokenId2, currentHeight, searchUnspentBoxesUpdated, sendTx } from "./explorer";
import { createTransaction, parseUtxo, signTransaction } from "./wasm";
import { maxBigInt } from "../utils/utils";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../utils/OptionDef";
import { BUY_OPTION_REQUEST_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants";
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export async function createOptionRequest(optionType, optionStyle, underlyingToken, optionAmount, shareSize, strikePrice, maturityDate, sigma, K1, K2) {
    const alert = waitingAlert("Preparing the transaction...");
    const maturityDateUNIX = maturityDate.valueOf();
    console.log("maturityDate", maturityDate.toISOString().substring(0, 10), maturityDateUNIX);

    const address = localStorage.getItem('address');
    var txAmount = 3 * TX_FEE + MIN_NANOERG_BOX_VALUE + DAPP_UI_MINT_FEE;

    if (optionType === 1) { // Put reserve
        txAmount = txAmount + optionAmount * strikePrice * shareSize;
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
    console.log("optionName", optionName)
    mintBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
    mintBoxBuilder.set_register_value(5, await encodeHexConst(DAPP_UI_ERGOTREE));
    mintBoxBuilder.set_register_value(6, await encodeStrConst("0"));

    const box = await boxById("84844f06f3dc31e92770376ccd2b2e47f218c9666d9fef7f5421040c75f83ad7"); // small box with R4, R5, R6 Call[Byte], R7 Box
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
    console.log("buyOptionRequest")
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
    const oracleBoxes = await boxByTokenId2(UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).oracleNFTID)

    const tx = await createTransaction(boxSelection, outputCandidates, [oracleBoxes[0]], address, utxos);
    console.log("processBuyRequest tx", tx);
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    console.log("processBuyRequest wallet", wallet);
    const signedTxTmp = await signTransaction(tx, utxos, [parseUtxo(oracleBoxes[0]) ], wallet);
    const signedTx = JSONBigInt.parse(signedTxTmp);
    console.log("processBuyRequest signedTx", signedTx, signedTxTmp);
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

    const testBox = {
        "boxId": "45a39aae557fa69fe4e7cd719797517fd756fd5267abcf65582779663d95904b",
        "value": "42490102187969",
        "ergoTree": "1999030f0400040204020404040405feffffffffffffffff0105feffffffffffffffff01050004d00f040004000406050005000580dac409d819d601b2a5730000d602e4c6a70404d603db63087201d604db6308a7d605b27203730100d606b27204730200d607b27203730300d608b27204730400d6099973058c720602d60a999973068c7205027209d60bc17201d60cc1a7d60d99720b720cd60e91720d7307d60f8c720802d6107e720f06d6117e720d06d612998c720702720fd6137e720c06d6147308d6157e721206d6167e720a06d6177e720906d6189c72117217d6199c72157217d1ededededededed93c27201c2a793e4c672010404720293b27203730900b27204730a00938c7205018c720601938c7207018c72080193b17203730b9593720a730c95720e929c9c721072117e7202069c7ef07212069a9c72137e7214067e9c720d7e72020506929c9c721372157e7202069c7ef0720d069a9c72107e7214067e9c72127e7202050695ed720e917212730d907216a19d721872139d72197210ed9272189c721672139272199c7216721091720b730e",
        "assets": [
            {
                "tokenId": "1d5afc59838920bb5ef2a8f9d63825a55b1d48e269d7cecee335d637c3ff5f3f",
                "amount": "1",
                "name": "",
                "decimals": 0
            },
            {
                "tokenId": "fa6326a26334f5e933b96470b53b45083374f71912b0d7597f00c2c7ebeb5da6",
                "amount": "9223372009229823800",
                "name": "",
                "decimals": 0
            },
            {
                "tokenId": "003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0",
                "amount": "86259688",
                "name": "SigRSV",
                "decimals": 0
            }
        ],
        "additionalRegisters": {
            "R4": "04c60f"
        },
        "creationHeight": 922632,
        "address": "5vSUZRZbdVbnk4sJWjg2uhL94VZWRg4iatK9VgMChufzUgdihgvhR8yWSUEJKszzV7Vmi6K8hCyKTNhUaiP8p5ko6YEU9yfHpjVuXdQ4i5p4cRCzch6ZiqWrNukYjv7Vs5jvBwqg5hcEJ8u1eerr537YLWUoxxi1M4vQxuaCihzPKMt8NDXP4WcbN6mfNxxLZeGBvsHVvVmina5THaECosCWozKJFBnscjhpr3AJsdaL8evXAvPfEjGhVMoTKXAb2ZGGRmR8g1eZshaHmgTg2imSiaoXU5eiF3HvBnDuawaCtt674ikZ3oZdekqswcVPGMwqqUKVsGY4QuFeQoGwRkMqEYTdV2UDMMsfrjrBYQYKUBFMwsQGMNBL1VoY78aotXzdeqJCBVKbQdD3ZZWvukhSe4xrz8tcF3PoxpysDLt89boMqZJtGEHTV9UBTBEac6sDyQP693qT3nKaErN8TCXrJBUmHPqKozAg9bwxTqMYkpmb9iVKLSoJxG7MjAj72SRbcqQfNCVTztSwN3cRxSrVtz4p87jNFbVtFzhPg7UqDwNFTaasySCqM",
        "transactionId": "cdc4f570bb314439cf1d4cd5bea4f32fd02770e3894b853234ab73cf24e8e6fe",
        "index": 0,
        "extension": {}
    }

    const testBox2 = await boxByIdv2("45a39aae557fa69fe4e7cd719797517fd756fd5267abcf65582779663d95904b")
    console.log("testBox2 ", testBox2)
    try {

        const boxWASM0 = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(testBox));
        console.log("boxWASM0 ", boxWASM0.to_json())
    } catch (e) {
        console.log(e)
    }

    return;

    const boxBytes = {
        "boxId": "45a39aae557fa69fe4e7cd719797517fd756fd5267abcf65582779663d95904b",
        "bytes": "c18fcafbcfd4091999030f0400040204020404040405feffffffffffffffff0105feffffffffffffffff01050004d00f040004000406050005000580dac409d819d601b2a5730000d602e4c6a70404d603db63087201d604db6308a7d605b27203730100d606b27204730200d607b27203730300d608b27204730400d6099973058c720602d60a999973068c7205027209d60bc17201d60cc1a7d60d99720b720cd60e91720d7307d60f8c720802d6107e720f06d6117e720d06d612998c720702720fd6137e720c06d6147308d6157e721206d6167e720a06d6177e720906d6189c72117217d6199c72157217d1ededededededed93c27201c2a793e4c672010404720293b27203730900b27204730a00938c7205018c720601938c7207018c72080193b17203730b9593720a730c95720e929c9c721072117e7202069c7ef07212069a9c72137e7214067e9c720d7e72020506929c9c721372157e7202069c7ef0720d069a9c72107e7214067e9c72127e7202050695ed720e917212730d907216a19d721872139d72197210ed9272189c721672139272199c7216721091720b730e88a838031d5afc59838920bb5ef2a8f9d63825a55b1d48e269d7cecee335d637c3ff5f3f01fa6326a26334f5e933b96470b53b45083374f71912b0d7597f00c2c7ebeb5da6b8deb28b99ffffff7f003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0e8ef90290104c60fcdc4f570bb314439cf1d4cd5bea4f32fd02770e3894b853234ab73cf24e8e6fe00"
    }
    console.log("boxBytes", boxBytes)
    try {

        const boxWASM1 = (await ergolib).ErgoBox.sigma_parse_bytes(Buffer.from(boxBytes.bytes, 'hex'));
        console.log("boxWASM1 ", boxWASM1.to_json())
        const boxWASM2 = (await ergolib).ErgoBox.from_json(boxWASM1.to_json());
        console.log("boxWASM2 ", boxWASM2.to_json())
    } catch (e) {
        console.log(e)
    }




}