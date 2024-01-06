import { errorAlert, waitingAlert } from "../utils/Alerts";
import { blake2b256, decodeLongArray, encodeHexArrayConst, encodeHexConst, encodeLongArray, encodeStrConst, getErgotreeHash } from "../ergo-related/serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_ERGOTREE_HASH, DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE } from "../utils/constants";
import { getTokenUtxos, getUtxos, walletSignTx } from "../ergo-related/wallet";
import { boxById, currentHeight, getTokenInfo, searchUnspentBoxesUpdated } from "../ergo-related/explorer";
import { createTransaction, getRegisterValue } from "../ergo-related/wasm";
import JSONBigInt from 'json-bigint';
import { EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS, PEER_BOX_SCRIPT_ADDRESS } from "../utils/script_constants";
import { OptionDef } from "../objects/OptionDef";
import { getOptionName } from "../utils/option_utils";

let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export async function createOptionRequest(optionType, optionStyle, underlyingTokenId, optionAmount, shareSize, strikePrice, maturityDate, txFee, optionDeliveryAddress, optionExerciseAddress, optionCloseAddress) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    var alert = waitingAlert("Preparing the transaction...");
    try {
        const maturityDateUNIX = maturityDate.valueOf();
        const underlyingToken = await getTokenInfo(underlyingTokenId);
        if (underlyingToken?.status === 404) {
            alert = errorAlert("Token not found, ID: " + underlyingTokenId)
            return;
        }

        const optionAmountRaw = optionAmount * Math.pow(10, underlyingToken.decimals);
        const strikePriceRaw = Math.floor(strikePrice / Math.pow(10, underlyingToken.decimals));
        const mintFee = DAPP_UI_MINT_FEE + Math.floor(optionAmountRaw * strikePriceRaw * shareSize * DAPP_UI_FEE / 1000);
        var txAmount = 4 * txFee + 2 * MIN_NANOERG_BOX_VALUE + mintFee;

        if (optionType === 1) { // Put reserve
            txAmount = txAmount + optionAmountRaw * strikePriceRaw * shareSize;
        }
        const optionBoxValue = txAmount - txFee - 2 * MIN_NANOERG_BOX_VALUE;

        var utxos = await getUtxos(txAmount);
        const requiredTokenAmount = optionAmountRaw * shareSize;
        if (optionType === 0) { // Call reserve
            const utxos1 = await getTokenUtxos(requiredTokenAmount, underlyingToken.id);
            utxos = utxos.concat(utxos1).filter((value, index, self) => index === self.findIndex((t) => (
                t.boxId === value.boxId
            )));;

        }

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionBoxValue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(OPTION_SCRIPT_ADDRESS)),
            creationHeight);
        if (optionType === 0) { // Call reserve
            mintBoxBuilder.add_token(
                (await ergolib).TokenId.from_str(underlyingToken.id),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requiredTokenAmount.toString()))
            );
        }

        const optionName = getOptionName(optionType, optionStyle, underlyingToken.name, strikePrice, maturityDate, shareSize);
        mintBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
        mintBoxBuilder.set_register_value(5, await encodeHexConst(underlyingToken.id));
        mintBoxBuilder.set_register_value(6, await encodeStrConst(underlyingToken.decimals.toString()));

        const box = await boxById("84844f06f3dc31e92770376ccd2b2e47f218c9666d9fef7f5421040c75f83ad7"); // small box with R4, R5, R6 Call[Byte], R7 Box
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
        mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));

        const optionParams = [optionType, optionStyle, shareSize, maturityDateUNIX, strikePriceRaw, mintFee, txFee];
        mintBoxBuilder.set_register_value(8, await encodeLongArray(optionParams.map(x => x.toString())));

        const ECPointByteArray = (await ergolib).Address.from_base58(address).content_bytes();
        const ECPointHex = Buffer.from(ECPointByteArray).toString('hex');

        // ouput contract are user address, implementation as it is
        //const issuerErgotree = (await ergolib).Address.from_base58(address).to_ergo_tree().to_base16_bytes();
        const optionDeliveryErgotree = (await ergolib).Address.from_base58(optionDeliveryAddress).to_ergo_tree().to_base16_bytes();
        const optionDeliveryErgotreeHash = getErgotreeHash(optionDeliveryErgotree);
        const optionExerciseErgotree = (await ergolib).Address.from_base58(optionExerciseAddress).to_ergo_tree().to_base16_bytes();
        const optionExerciseErgotreeHash = getErgotreeHash(optionExerciseErgotree);
        const optionCloseErgotree = (await ergolib).Address.from_base58(optionCloseAddress).to_ergo_tree().to_base16_bytes();
        const optionCloseErgotreeHash = getErgotreeHash(optionCloseErgotree);

        //const issuerErgotreeHash = getErgotreeHash(issuerErgotree)
        //console.log("issuerErgotree",issuerErgotree, "issuerErgotreeHash", issuerErgotreeHash);
        const R9Array = await encodeHexArrayConst([ECPointHex, DAPP_UI_ERGOTREE_HASH,
            optionDeliveryErgotreeHash, optionExerciseErgotreeHash, optionCloseErgotreeHash]);
        mintBoxBuilder.set_register_value(9, R9Array);

        try {
            outputCandidates.add(mintBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }

        // Create the peer box
        const peerBoxValueStr = (2 * MIN_NANOERG_BOX_VALUE).toString();
        const peerBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(peerBoxValueStr));
        const peerBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            peerBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(PEER_BOX_SCRIPT_ADDRESS)),
            creationHeight);
        peerBoxBuilder.set_register_value(4, await encodeStrConst(optionName));
        peerBoxBuilder.set_register_value(5, await encodeHexConst(underlyingToken.id));
        peerBoxBuilder.set_register_value(6, await encodeStrConst(underlyingToken.decimals.toString()));

        let optionUnderlyingTokenAmount = 0;
        if (optionType === 0) { // Call reserve
            optionUnderlyingTokenAmount = requiredTokenAmount
        }
        const optionValues = [optionBoxValue, optionUnderlyingTokenAmount]
        peerBoxBuilder.set_register_value(7, await encodeLongArray(optionValues.map(x => x.toString())));

        peerBoxBuilder.set_register_value(8, await encodeLongArray(optionParams.map(x => x.toString())));

        const optionScriptErgotree = (await ergolib).Address.from_base58(OPTION_SCRIPT_ADDRESS).to_ergo_tree().to_base16_bytes();
        const optionScriptErgotreeHash = getErgotreeHash(optionScriptErgotree)

        const R9PeerArray = await encodeHexArrayConst([ECPointHex, DAPP_UI_ERGOTREE, optionDeliveryErgotree, optionExerciseErgotree, optionCloseErgotree, optionScriptErgotreeHash]);
        peerBoxBuilder.set_register_value(9, R9PeerArray);

        try {
            outputCandidates.add(peerBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }


        var tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, txFee);
        console.log("create option request tx", tx);
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}


export async function refundOptionRequest(requestBox) {
    console.log("refundOptionRequest requestBox", requestBox)
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    var alert = waitingAlert("Preparing the transaction...");
    try {
        const optionDef = await OptionDef.create(requestBox);
        const peerBox = await optionDef.getPeerBox();

        let inputs = [requestBox];
        let ouputValue = requestBox.value - optionDef.txFee;
        if (peerBox) {
            inputs.push(peerBox.full);
            ouputValue = ouputValue + peerBox.full.value;
            console.log("peerBox", peerBox);
        }
        console.log("inputs", inputs);
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(inputs);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
        const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(ouputValue.toString()));
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
        var tx = await createTransaction(boxSelection, outputCandidates, [], address, inputs, optionDef.txFee);
        console.log("create option request tx", tx)
        const txId = await walletSignTx(alert, tx, address);
        return txId;
    } catch (e) {
        console.log(e);
        errorAlert(e.toString());
    }
}


export async function exerciseOptionRequest(optionTokenId, optionAmount, exerciseAddress) {
    const address = localStorage.getItem('address') ?? '';
    if (address === '') {
        errorAlert("Set the ERG address to use SigmaO !");
        return;
    }
    var alert = waitingAlert("Preparing the transaction...");
    try {
        const optionIssuerBox = await boxById(optionTokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        var requestBoxValue = BigInt(optionDef.txFee) + BigInt(2 * MIN_NANOERG_BOX_VALUE);
        var underlyingTokenInfo = await getTokenInfo(optionDef.underlyingTokenId);
        const optionRawAmount = BigInt(optionAmount) * BigInt(Math.pow(10, underlyingTokenInfo.decimals));
        if (optionDef.optionType === 0) { // Call
            requestBoxValue = requestBoxValue + optionRawAmount * BigInt(optionDef.strikePrice * optionDef.shareSize)
        }
        //requestBoxValue = maxBigInt(requestBoxValue, BigInt(optionDef.txFee) + BigInt(2 * MIN_NANOERG_BOX_VALUE))
        var utxos = await getUtxos(BigInt(optionDef.txFee) + requestBoxValue);
        var utxos1 = await getTokenUtxos(optionRawAmount, optionTokenId)
        utxos = utxos.concat(utxos1).filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.boxId === value.boxId
            )));;

        const underlyingTokenRawAmount = optionRawAmount * BigInt(optionDef.shareSize);
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
            (await ergolib).TokenId.from_str(optionTokenId),
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

        // Option delivery ergotree
        //console.log("exerciseAddress", exerciseAddress);
        const exerciseErgotree = (await ergolib).Address.from_base58(exerciseAddress).to_ergo_tree().to_base16_bytes();
        mintBoxBuilder.set_register_value(6, await encodeHexConst(exerciseErgotree));

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
