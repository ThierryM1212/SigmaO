import { displayTransaction, waitingAlert } from "../utils/Alerts";
import { ergoTreeToAddress, sigmaPropToAddress } from "../ergo-related/serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE } from "../utils/constants";
import { boxById, currentHeight, searchUnspentBoxesUpdated, sendTx } from "../ergo-related/explorer";
import { createTransaction, signTransaction } from "../ergo-related/wasm";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../objects/OptionDef";
import { ergolib } from "./BuyRequestActions";
import { OPTION_SCRIPT_ADDRESS } from "../utils/script_constants";
import { maxBigInt } from "../utils/utils";

/* global BigInt */

export async function mintOption(requestBox) {
    console.log("mintOption requestBox", requestBox);
    const address = localStorage.getItem('address');
    const optionDef = await OptionDef.create(requestBox);

    const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
    const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
    const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
    const creationHeight = await currentHeight();
    const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
    //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
    const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - optionDef.txFee - optionDef.dAppUIMintFee).toString()));
    const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
        mintBoxValue,
        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(requestBox.address)),
        creationHeight);

    // Compute number minted options
    var numMintedOptionTokens = 0, underlyingTokenAmount = 0;
    if (optionDef.optionType === 0) { // Call reserve
        underlyingTokenAmount = BigInt(parseInt(requestBox.assets[0].amount));
        numMintedOptionTokens = underlyingTokenAmount / BigInt(optionDef.shareSize) + BigInt(1);
    } else { // Put reserve (ERG)
        numMintedOptionTokens = BigInt(requestBox.value - 3 * optionDef.txFee - optionDef.dAppUIMintFee - 2 * MIN_NANOERG_BOX_VALUE) / BigInt(optionDef.shareSize * optionDef.strikePrice) + BigInt(1);
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
    mintBoxBuilder.set_register_value(5, boxWASM.register_value(5));
    mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
    mintBoxBuilder.set_register_value(7, (await ergolib).Constant.from_ergo_box(boxWASM));
    try {
        outputCandidates.add(mintBoxBuilder.build());
    } catch (e) {
        console.log(`building error: ${e}`);
        throw e;
    }

    // dApp Mint fee box
    const dAppMintFeeValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionDef.dAppUIMintFee.toString()));
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

    var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox], optionDef.txFee);
    console.log("create option request tx", tx);
    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
    const signedTx = await signTransaction(tx, [requestBox], [], wallet);
    const txId = await sendTx(JSONBigInt.parse(signedTx));
    displayTransaction(txId);
    return txId;
}

export async function deliverOption(requestBox) {
    try {
        console.log("deliverOption requestBox", requestBox)
        const address = localStorage.getItem('address');
        //const optionIssuerBox = await boxById(requestBox.assets[0].tokenId);
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(requestBox));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(7).to_ergo_box().to_json());
        const optionDef = await OptionDef.create(optionIssuerBox);

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((requestBox.value - optionDef.txFee - MIN_NANOERG_BOX_VALUE).toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(requestBox.address)),
            creationHeight);

        // 1 option token
        mintBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(requestBox.assets[0].tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str("1"))
        );
        // Add reserve tokens for Call options
        if (optionDef.optionType === 0) { // Call reserve
            mintBoxBuilder.add_token(
                (await ergolib).TokenId.from_str(requestBox.assets[1].tokenId),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(requestBox.assets[1].amount.toString()))
            );
        }

        mintBoxBuilder.set_register_value(4, boxWASM.register_value(4));
        mintBoxBuilder.set_register_value(5, boxWASM.register_value(5));
        mintBoxBuilder.set_register_value(6, boxWASM.register_value(6));
        mintBoxBuilder.set_register_value(7, boxWASM.register_value(7));

        try {
            outputCandidates.add(mintBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }


        // deliver option box
        const deliverValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(MIN_NANOERG_BOX_VALUE.toString()));
        const deliverBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            deliverValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionDef.issuerAddress)),
            creationHeight);

        deliverBoxBuilder.add_token(
            (await ergolib).TokenId.from_str(requestBox.assets[0].tokenId),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str((requestBox.assets[0].amount - 1).toString()))
        );
        try {
            outputCandidates.add(deliverBoxBuilder.build());
        } catch (e) {
            console.log(`building error: ${e}`);
            throw e;
        }

        console.log("deliverValue", deliverValue)

        var tx = await createTransaction(boxSelection, outputCandidates, [], address, [requestBox], optionDef.txFee);
        console.log("create option request tx", tx)
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = await signTransaction(tx, [requestBox], [], wallet);
        const txId = await sendTx(JSONBigInt.parse(signedTx));
        displayTransaction(txId);
        return txId;
    } catch (e) {
        console.log(e)
    }

}



export async function processExerciseRequest(box) {
    try {
        console.log("processExerciseRequest", box);
        const alert = waitingAlert("Preparing the transaction...");
        const address = localStorage.getItem('address');
        const optionTokenID = box.assets[0].tokenId;
        const optionBuyerAddress = await sigmaPropToAddress(box.additionalRegisters.R4.serializedValue);
        const optionBuyAmount = box.assets[0].amount;
        const optionIssuerBox = await boxById(optionTokenID);
        const optionDef = await OptionDef.create(optionIssuerBox);
        console.log("optionDef", optionDef)
        const optionReserveBoxes = await searchUnspentBoxesUpdated(OPTION_SCRIPT_ADDRESS, [optionTokenID]);
        const utxos = [optionReserveBoxes[0], box];
        console.log("utxos", utxos)
        const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionReserveBoxes[0]));
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

        const initialReserveValue = parseInt(optionReserveBoxes[0].value);
        var outputReserveValue = initialReserveValue
        if (optionDef.optionType === 1) { // Put option reserve updated
            outputReserveValue = outputReserveValue - optionBuyAmount * optionDef.shareSize * optionDef.strikePrice;
        }
        console.log("initialReserveValue outputReserveValue", initialReserveValue, outputReserveValue)

        // rebuild the option reserve
        const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(outputReserveValue.toString())),
            //new (await ergolib).Contract(reserveBoxWASM.ergo_tree()),
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(OPTION_SCRIPT_ADDRESS)),
            creationHeight);

        optionReserveBoxBuilder.add_token( // option token unchanged
            reserveBoxWASM.tokens().get(0).id(),
            reserveBoxWASM.tokens().get(0).amount(),
        );

        const requiredUnderlyingTokenAmount = BigInt(optionBuyAmount * optionDef.shareSize)
        if (optionDef.optionType === 0) { // Call option reserve updated
            const initialReserveTokenAmount = reserveBoxWASM.tokens().get(1).amount().as_i64().to_str();
            const outputReserveTokenAmount = BigInt(initialReserveTokenAmount) - requiredUnderlyingTokenAmount;
            console.log("outputReserveTokenAmount", outputReserveTokenAmount);
            if (outputReserveTokenAmount > BigInt(0)) {
                optionReserveBoxBuilder.add_token( // underlying token
                    (await ergolib).TokenId.from_str(optionDef.underlyingTokenId),
                    (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveTokenAmount.toString())),
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
        } else { // Put deliver ERG
            issuerPayBoxValue = BigInt(MIN_NANOERG_BOX_VALUE);
        }
        exerciseDeliveryBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(initialReserveValue - outputReserveValue) + initialRequestValue - BigInt(optionDef.txFee) - issuerPayBoxValue);

        console.log("exerciseDeliveryBoxValue", initialRequestValue, exerciseDeliveryBoxValue, issuerPayBoxValue)
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
        console.log("issuerPayBoxBuilder", issuerPayBoxValue);
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

        const tx = await createTransaction(boxSelection, outputCandidates, [], address, utxos, optionDef.txFee, true);
        console.log("tx", tx)
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = JSONBigInt.parse(await signTransaction(tx, utxos, [], wallet));
        const txId = await sendTx(signedTx);
        displayTransaction(txId);
        return txId;
    } catch (e) {
        console.log(e)
    }

}



export async function closeOptionExpired(box, issuerAddress) {
    const alert = waitingAlert("Preparing the transaction...");
    try {
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([box]);

        const inputWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
        const optionIssuerBox = await boxById(box.assets[0].tokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        const useroutputvalue = box.value - optionDef.txFee;

        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(useroutputvalue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(issuerAddress)),
            creationHeight);
        if (optionDef.optionType === 0 && inputWASM.tokens().len() > 1) { // Call return reserve tokens
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
        var tx = await createTransaction(boxSelection, outputCandidates, [], issuerAddress, [box], optionDef.txFee, true);
        console.log("tx", tx);
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = JSONBigInt.parse(await signTransaction(tx, [box], [], wallet));
        const txId = await sendTx(signedTx);
        displayTransaction(txId);
        return txId;
    } catch (e) {
        console.log(e)
        alert.close();
    }

}



