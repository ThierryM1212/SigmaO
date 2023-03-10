import { ergoTreeToAddress } from "../ergo-related/serializer";
import { DAPP_UI_ERGOTREE, DAPP_UI_FEE, MIN_NANOERG_BOX_VALUE } from "../utils/constants";
import { boxByIdv1, boxByTokenId2, currentHeight, searchUnspentBoxesUpdated, sendTx } from "../ergo-related/explorer";
import { createTransaction, parseUtxo, signTransaction } from "../ergo-related/wasm";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../objects/OptionDef";
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants";
import { maxBigInt } from "../utils/utils";
import { SellOptionRequest } from "../objects/SellOptionRequest";
let ergolib = import('ergo-lib-wasm-browser');


/* global BigInt */

export async function mintOption(requestBox) {
    //console.log("mintOption requestBox", requestBox);    
    try {
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

        var tx = await createTransaction(boxSelection, outputCandidates, [], optionDef.issuerAddress, [requestBox], optionDef.txFee);
        console.log("create option request tx", tx);
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = await signTransaction(tx, [requestBox], [], wallet);
        const txId = await sendTx(JSONBigInt.parse(signedTx));
        //displayTransaction(txId);
        return txId;
    } catch (e) {
        console.log(e);
        return e;
    }
}

export async function deliverOption(requestBox) {
    //console.log("deliverOption requestBox", requestBox)
    try {
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(requestBox));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(7).to_ergo_box().to_json());
        const optionDef = await OptionDef.create(optionIssuerBox);

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([requestBox]);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
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

        var tx = await createTransaction(boxSelection, outputCandidates, [], optionDef.issuerAddress, [requestBox], optionDef.txFee);
        console.log("create option request tx", tx)
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = await signTransaction(tx, [requestBox], [], wallet);
        const txId = await sendTx(JSONBigInt.parse(signedTx));
        return txId;
    } catch (e) {
        console.log(e)
        return e.toString();
    }
}


export async function processExerciseRequest(exerciseRequest) {
    try {
        const optionDef = exerciseRequest.optionDef;
        const optionReserveBoxes = await searchUnspentBoxesUpdated(OPTION_SCRIPT_ADDRESS, [exerciseRequest.optionTokenId]);
        const utxos = [optionReserveBoxes[0], exerciseRequest.full];
        const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(optionReserveBoxes[0]));
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

        const initialReserveValue = parseInt(optionReserveBoxes[0].value);
        var outputReserveValue = initialReserveValue
        if (optionDef.optionType === 1) { // Put option reserve updated
            outputReserveValue = outputReserveValue - exerciseRequest.optionAmount * optionDef.shareSize * optionDef.strikePrice;
        }

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

        const requiredUnderlyingTokenAmount = BigInt(exerciseRequest.optionAmount * optionDef.shareSize)
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
        const initialRequestValue = BigInt(exerciseRequest.full.value);
        var issuerPayBoxValue = BigInt(0), exerciseDeliveryBoxValue = BigInt(0);
        if (optionDef.optionType === 0) { // Call option deliver token
            issuerPayBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(exerciseRequest.optionAmount) * BigInt(optionDef.strikePrice * optionDef.shareSize));
        } else { // Put deliver ERG
            issuerPayBoxValue = BigInt(MIN_NANOERG_BOX_VALUE);
        }
        exerciseDeliveryBoxValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(initialReserveValue - outputReserveValue) + initialRequestValue - BigInt(optionDef.txFee) - issuerPayBoxValue);

        //console.log("exerciseDeliveryBoxValue", initialRequestValue, exerciseDeliveryBoxValue, issuerPayBoxValue)
        const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(exerciseDeliveryBoxValue.toString())),
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(exerciseRequest.exerciseAddress)),
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

        const tx = await createTransaction(boxSelection, outputCandidates, [], optionDef.issuerAddress, utxos, optionDef.txFee, true);
        console.log("tx", tx)
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = JSONBigInt.parse(await signTransaction(tx, utxos, [], wallet));
        const txId = await sendTx(signedTx);
        return txId;
    } catch (e) {
        console.log(e)
        return e.toString();
    }
}


export async function closeOptionExpired(box) {
    try {
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([box]);
        const inputWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(box));
        const optionIssuerBox = await boxByIdv1(box.assets[0].tokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        const useroutputvalue = box.value - optionDef.txFee;

        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        const mintBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(useroutputvalue.toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            mintBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionDef.issuerAddress)),
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
        var tx = await createTransaction(boxSelection, outputCandidates, [], optionDef.issuerAddress, [box], optionDef.txFee, true);
        console.log("tx", tx);
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTx = JSONBigInt.parse(await signTransaction(tx, [box], [], wallet));
        const txId = await sendTx(signedTx);
        return txId;
    } catch (e) {
        console.log(e)
        return e.toString();
    }
}


export async function processBuyRequest(buyRequest) {
    //console.log("processBuyRequest", buyRequest);
    try {
        const optionTokenId = buyRequest.optionTokenId;
        const optionBuyAmount = parseInt(buyRequest.optionAmount);
        const optionBuyerAddress = buyRequest.buyerAddress;
        const initialBuyRequestValue = BigInt(buyRequest.full.value);
        const optionIssuerBox = await boxByIdv1(optionTokenId);
        const optionDef = await OptionDef.create(optionIssuerBox);
        const optionBuyAmountRaw = optionBuyAmount * Math.pow(10, optionDef.underlyingTokenInfo.decimals);
        const sellOptionScriptAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId).sellOptionScriptAddress;
        const optionReserveBoxes = await searchUnspentBoxesUpdated(sellOptionScriptAddress, [optionTokenId]);

        const sellOptionList = await Promise.all(optionReserveBoxes.map(b => SellOptionRequest.create(b)));
        const buyMaxPrice = (buyRequest.buyRequestValue - optionDef.txFee - MIN_NANOERG_BOX_VALUE) / (optionBuyAmount + (DAPP_UI_FEE * optionBuyAmount) / 1000)
        //console.log("buyMaxPrice", buyMaxPrice, sellOptionList, optionBuyAmountRaw)
        const validSellOptionList = sellOptionList.filter(so => so.optionAmount >= optionBuyAmountRaw && so.currentOptionPrice <= buyMaxPrice)

        const utxos = [validSellOptionList[0].full, buyRequest.full];
        console.log("validSellOptionList[0]",validSellOptionList[0])
        const optionValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(optionBuyAmountRaw) * BigInt(validSellOptionList[0].currentOptionPrice) );
        const dAppFee = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), (optionValue * BigInt(validSellOptionList[0].dAppUIFee)) / BigInt(1000));
        const optionDeliveryBoxValue = initialBuyRequestValue - BigInt(optionDef.txFee) - optionValue - dAppFee;
        //console.log("optionDeliveryBoxValue", optionDeliveryBoxValue, initialBuyRequestValue, optionValue, dAppFee)
        const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(validSellOptionList[0].full));

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

        // rebuild the option reserve
        const optionReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            reserveBoxWASM.value(), // unchanged
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(sellOptionScriptAddress)),
            creationHeight);
        const initialReserveOptionAmount = reserveBoxWASM.tokens().get(0).amount().as_i64().to_str();
        const outputReserveOptionAmount = BigInt(initialReserveOptionAmount) - BigInt(optionBuyAmountRaw);
        if (outputReserveOptionAmount > 0) {
            optionReserveBoxBuilder.add_token( // option token sold
                reserveBoxWASM.tokens().get(0).id(),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveOptionAmount.toString())),
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
        const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(optionDeliveryBoxValue.toString())),
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(optionBuyerAddress)),
            creationHeight);
        optionDeliveryBoxBuilder.add_token( // option
            reserveBoxWASM.tokens().get(0).id(),
            (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(optionBuyAmountRaw.toString())),
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

        const tx = await createTransaction(boxSelection, outputCandidates, [oracleBoxes[0]], optionDef.issuerAddress, utxos, optionDef.txFee);
        console.log("processBuyRequest tx", tx);
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTxTmp = await signTransaction(tx, utxos, [parseUtxo(oracleBoxes[0])], wallet);
        const signedTx = JSONBigInt.parse(signedTxTmp);
        const txId = await sendTx(signedTx);
        return txId;
    } catch (e) {
        console.log(e);
        return e.toString();
    }
}


export async function closeSellOption(sellRequest) {
    try {
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(sellRequest.full));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(5).to_ergo_box().to_json());
        const optionDef = await OptionDef.create(optionIssuerBox);

        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([sellRequest.full]);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const creationHeight = await currentHeight();
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();
        const refundBoxValue = (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str((sellRequest.full.value - optionDef.txFee).toString()));
        const mintBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
            refundBoxValue,
            (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(sellRequest.sellerAddress)),
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
        var tx = await createTransaction(boxSelection, outputCandidates, [], sellRequest.sellerAddress, [sellRequest.full], optionDef.txFee);
        console.log("create option request tx", tx)
        const wallet = (await ergolib).Wallet.from_mnemonic("", "");
        const signedTxTmp = await signTransaction(tx, [sellRequest.full], [], wallet);
        const signedTx = JSONBigInt.parse(signedTxTmp);
        const txId = await sendTx(signedTx);
        return txId;

    } catch (e) {
        console.log(e);
        return e.toString();
    }
}
