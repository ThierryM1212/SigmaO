import { waitingAlert, errorAlert } from "../utils/Alerts";
import { encodeHexConst, encodeLong, encodeLongArray } from "../ergo-related/serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_FEE, MIN_NANOERG_BOX_VALUE, TX_FEE } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "../ergo-related/wallet";
import { boxById, currentHeight, getTokenInfo } from "../ergo-related/explorer";
import { createTransaction } from "../ergo-related/wasm";
import { maxBigInt } from "../utils/utils";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../objects/OptionDef";
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants";
import { SellOptionRequest } from "../objects/SellOptionRequest";
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export async function createSellOption(optionTokenId, optionAmount, sigma, K1, K2, freezeDelay) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const optionIssuerBox = await boxById(optionTokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        const txAmount = 2 * optionDef.txFee + MIN_NANOERG_BOX_VALUE;
        const optionAmountAdjusted = optionAmount * Math.pow(10, optionDef.underlyingTokenInfo.decimals);
        const freezeDelayMilli = freezeDelay * 3600 * 1000;
        var utxos = await getUtxos(txAmount);
        const utxos1 = await getTokenUtxos(optionAmountAdjusted, optionTokenId);
        utxos = utxos.concat(utxos1).filter((value, index, self) => index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const sellBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((txAmount - optionDef.txFee).toString()));
        const sellScriptAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).sellOptionScriptAddress;
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            sellBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(sellScriptAddress)),
            creationHeight);
        const sellerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
            (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
        );
        mintBoxBuilder.set_register_value(4, sellerSigmaProp);
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionDef.full));
        mintBoxBuilder.set_register_value(5, (await ergolib).Constant.from_ergo_box(boxWASM));
        const sellParams = [sigma, K1, K2, freezeDelayMilli, DAPP_UI_FEE];
        console.log("sellParams", sellParams);
        mintBoxBuilder.set_register_value(6, await encodeLongArray(sellParams.map(x => x.toString())));
        mintBoxBuilder.set_register_value(7, await encodeHexConst(DAPP_UI_ERGOTREE));
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(optionTokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionAmountAdjusted.toString()))
        );
        try {
            outputCandidates.add(mintBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }
        var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, optionDef.txFee);
        console.log("createSellOption tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}

export async function refundSellOption(sellBox) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const sellOption = await SellOptionRequest.create(sellBox);
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(sellBox));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(5).to_ergo_box().to_json());
        const optionDef = await OptionDef.create(optionIssuerBox);

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([sellBox]);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
        const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((sellBox.value - optionDef.txFee).toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            refundBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(sellOption.sellerAddress)),
            creationHeight);
        mintBoxBuilder.set_register_value(4, boxWASM.register_value(4));
        mintBoxBuilder.set_register_value(5, boxWASM.register_value(5));
        mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
        mintBoxBuilder.set_register_value(7, boxWASM.register_value(7));
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
        var tx = await createTransaction(boxSelection, outputCandidates, [], address, [sellBox], optionDef.txFee);
        console.log("refundSellOption tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}

export async function createTokenSellRequest(tokenId, tokenAmount, tokenPrice) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const tokenInfo = await getTokenInfo(tokenId);
        const tokenDecimalFactor = Math.pow(10, tokenInfo.decimals);
        const requiredTokenAmount = tokenAmount * tokenDecimalFactor;
        const priceRaw = Math.round(tokenPrice / tokenDecimalFactor);
        const reserveValue = MIN_NANOERG_BOX_VALUE + TX_FEE;
        var utxos = await getUtxos(reserveValue + TX_FEE);
        const utxos1 = await getTokenUtxos(requiredTokenAmount, tokenId);
        utxos = utxos.concat(utxos1).filter((value, index, self) => index === self.findIndex((t) => (
            t.boxId === value.boxId
        )));;

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(reserveValue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(SELL_FIXED_SCRIPT_ADDRESS)),
            creationHeight);
        const sellerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
            (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
        );
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredTokenAmount.toString()))
        );
        mintBoxBuilder.set_register_value(4, sellerSigmaProp);
        mintBoxBuilder.set_register_value(5, await encodeLong(priceRaw.toString()));
        try {
            outputCandidates.add(mintBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }

        var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, TX_FEE);
        console.log("create but option request tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}

export async function createTokenBuyRequest(tokenId, tokenAmount, tokenPrice) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const tokenInfo = await getTokenInfo(tokenId);
        const tokenDecimalFactor = Math.pow(10, tokenInfo.decimals);
        const tokenAmountRaw = tokenAmount * tokenDecimalFactor;
        const requiredReserveAmount = tokenAmountRaw * tokenPrice;
        const reserveValue = MIN_NANOERG_BOX_VALUE + TX_FEE + requiredReserveAmount;
        var utxos = await getUtxos(reserveValue + TX_FEE);

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(reserveValue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS)),
            creationHeight);
        const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
            (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
        );
        mintBoxBuilder.set_register_value(4, buyerSigmaProp);
        mintBoxBuilder.set_register_value(5, await encodeHexConst(tokenId));
        mintBoxBuilder.set_register_value(6, await encodeLong(tokenAmountRaw.toString()));
        try {
            outputCandidates.add(mintBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }

        var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, TX_FEE);
        console.log("create but option request tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}


export async function createBuyOptionRequest(sellRequest, optionAmount, optionMaxPrice) {
    console.log("createBuyRequest ", sellRequest, optionAmount, optionMaxPrice)
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const optionTokenId = sellRequest.option.optionDef.optionTokenId;
        const optionIssuerBox = await boxById(optionTokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        const optionAmountRaw = optionAmount * Math.pow(10, optionDef.underlyingTokenInfo.decimals);
        const optionPrice = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionAmount) * BigInt(optionMaxPrice));
        const dAppFee = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), optionPrice * BigInt(sellRequest.dAppUIFee) / BigInt(1000));
        const requestBoxValue = BigInt(optionDef.txFee) + optionPrice + dAppFee + BigInt(MIN_NANOERG_BOX_VALUE);

        var utxos = await getUtxos(requestBoxValue + BigInt(optionDef.txFee));
        console.log("utxos", requestBoxValue, requestBoxValue + BigInt(optionDef.txFee), utxos)
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(requestBoxValue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS)),
            creationHeight);
        const buyerSigmaProp = (await ergolib).Constant.from_ecpoint_bytes(
            (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
        );
        mintBoxBuilder.set_register_value(4, buyerSigmaProp);
        mintBoxBuilder.set_register_value(5, await encodeHexConst(optionTokenId));
        mintBoxBuilder.set_register_value(6, await encodeLong(optionAmountRaw.toString()));
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
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}



export async function refundBuyRequest(requestBox) {
    //console.log("refundBuyRequest", requestBox);
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    const alert = waitingAlert("Preparing the transaction...");
    try {
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
        if (boxWASM.register_value(6)) {
            mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
        }

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
        var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox], TX_FEE);
        console.log("create option request tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}

