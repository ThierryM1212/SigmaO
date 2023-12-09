import { ergoTreeToAddress } from "../ergo-related/serializer.js";
import { DAPP_UI_ADDRESS, DAPP_UI_ERGOTREE, DAPP_UI_FEE, MIN_NANOERG_BOX_VALUE, TX_FEE } from "../utils/constants.js";
import { boxByIdv1, boxByTokenId2, currentHeight, searchUnspentBoxesUpdated, sendTx } from "../ergo-related/explorer.js";
import { createTransaction, parseUtxo, signTransaction } from "../ergo-related/wasm.js";
import JSONBigInt from 'json-bigint';
import { OptionDef } from "../objects/OptionDef.js";
import { OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants.js";
import { maxBigInt } from "../utils/utils.js";
import { SellOptionRequest } from "../objects/SellOptionRequest.js";
import { SellTokenRequest } from "../objects/SellTokenRequest.js";
let ergolib = import('ergo-lib-wasm-nodejs');


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
        //console.log("create option request tx", tx);
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
        //console.log("create option request tx", tx)
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
        //console.log("exerciseRequest", exerciseRequest.full.assets);
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
        //console.log("outputReserveValue", initialReserveValue, outputReserveValue);
        //console.log("outputReserveValue", exerciseRequest.optionAmount, optionDef.shareSize , optionDef.strikePrice);

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
        //console.log("tx", JSON.stringify(tx, null, 4))
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
        //console.log("tx", tx);
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
        const tokenId = buyRequest.tokenId;
        const tokenBuyAmount = parseInt(buyRequest.tokenAmount);
        const tokenBuyerAddress = buyRequest.buyerAddress;
        const initialBuyRequestValue = BigInt(buyRequest.full.value);
        const tokenIssuerBox = await boxByIdv1(tokenId);
        const underlyingTokenDecimalFactor = Math.pow(10, buyRequest.tokenInfo.decimals)

        if (tokenIssuerBox.address === OPTION_SCRIPT_ADDRESS) {
            const optionDef = await OptionDef.create(tokenIssuerBox);
            const sellOptionScriptAddress = UNDERLYING_TOKENS.find(tok => tok.tokenId === optionDef.underlyingTokenId)?.sellOptionScriptAddress;
            if (sellOptionScriptAddress) {
                const optionReserveBoxes = await searchUnspentBoxesUpdated(sellOptionScriptAddress, [tokenId]);
                const sellOptionList = await Promise.all(optionReserveBoxes.map(b => SellOptionRequest.create(b)));
                const buyMaxPrice = (buyRequest.buyRequestValue - optionDef.txFee - MIN_NANOERG_BOX_VALUE) / (tokenBuyAmount + DAPP_UI_FEE * tokenBuyAmount / 1000)
                //console.log("maxprice",sellOptionList[0].currentOptionPrice <= buyMaxPrice)
                //console.log("maxprice",sellOptionList[0].currentOptionPrice , buyMaxPrice)
                //console.log("amount",sellOptionList[0].optionAmount >= tokenBuyAmount)
                const validSellOptionList = sellOptionList.filter(so => so.optionAmount >= tokenBuyAmount &&
                    so.currentOptionPrice <= buyMaxPrice * underlyingTokenDecimalFactor)
                if (validSellOptionList.length > 0) {
                    const utxos = [validSellOptionList[0].full, buyRequest.full];
                    const optionValue = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE),
                        BigInt(tokenBuyAmount) * BigInt(validSellOptionList[0].currentOptionPrice) / BigInt(underlyingTokenDecimalFactor)
                    );
                    const dAppFee = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), (optionValue * BigInt(validSellOptionList[0].dAppUIFee)) / BigInt(1000));
                    const optionDeliveryBoxValue = initialBuyRequestValue - BigInt(optionDef.txFee) - optionValue - dAppFee;
                    console.log("optionDeliveryBoxValue", optionDeliveryBoxValue, initialBuyRequestValue, optionValue, dAppFee)
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
                    const outputReserveOptionAmount = BigInt(initialReserveOptionAmount) - BigInt(tokenBuyAmount);
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
                        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(tokenBuyerAddress)),
                        creationHeight);
                    optionDeliveryBoxBuilder.add_token( // option
                        reserveBoxWASM.tokens().get(0).id(),
                        (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(tokenBuyAmount.toString())),
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
                        (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(validSellOptionList[0].sellerAddress)),
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
                    console.log("processBuyRequest tx", JSON.stringify(tx));
                    const wallet = (await ergolib).Wallet.from_mnemonic("", "");
                    const signedTxTmp = await signTransaction(tx, utxos, [parseUtxo(oracleBoxes[0])], wallet);
                    const signedTx = JSONBigInt.parse(signedTxTmp);
                    const txId = await sendTx(signedTx);
                    return txId;
                }

            }
        }

        // SELL FIXED PRICE
        const sellTokenBoxes = await searchUnspentBoxesUpdated(SELL_FIXED_SCRIPT_ADDRESS, [tokenId]);
        const sellTokenRequests = await Promise.all(
            sellTokenBoxes.map(async b => SellTokenRequest.create(b))
        );
        //console.log("sellTokenRequests", sellTokenRequests)
        //console.log("buyRequest", buyRequest)
        //console.log("token sellable Amount", tokenBuyAmount)
        var validSellTokenRequests = [];
        for (const str of sellTokenRequests) {
            if (str.tokenAmount >= tokenBuyAmount) {
                const minPrice = str.tokenPrice * tokenBuyAmount * (1 + str.dAppUIFee / 1000);
                const availableAmounttoBuy = buyRequest.full.value - str.txFee - MIN_NANOERG_BOX_VALUE;
                //console.log ("minPrice", minPrice)
                //console.log ("availableAmounttoBuy", availableAmounttoBuy)
                if (minPrice <= availableAmounttoBuy) {
                    validSellTokenRequests.push(str);
                }

            } else {
                console.log("not enough token to sell ", str.tokenAmount , "<", tokenBuyAmount)
            }
        }
        //const validSellTokenRequests = sellTokenRequests.filter(str => str.tokenAmount >= tokenBuyAmount &&
        //    str.tokenPrice * tokenBuyAmount * (1 + str.dAppUIFee / 1000) <= buyRequest.full.value - str.txFee - MIN_NANOERG_BOX_VALUE);
        //console.log("validSellTokenRequests", validSellTokenRequests)

        if (validSellTokenRequests.length > 0) {

            const utxos = [validSellTokenRequests[0].full, buyRequest.full];
            const txFee = validSellTokenRequests[0].txFee;
            console.log("SELL request found for " + buyRequest.full.boxId);
            const reserveBoxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(validSellTokenRequests[0].full));

            const minPrice = Math.max(MIN_NANOERG_BOX_VALUE, validSellTokenRequests[0].tokenPrice * tokenBuyAmount);
            const dAppUIFee = Math.max(MIN_NANOERG_BOX_VALUE, Math.ceil(validSellTokenRequests[0].tokenPrice * tokenBuyAmount * validSellTokenRequests[0].dAppUIFee / 1000));

            const tokenDeliveryBoxValue = parseInt(initialBuyRequestValue) - txFee - minPrice - dAppUIFee;
            //console.log("value",initialBuyRequestValue, totalPrice, tokenDeliveryBoxValue);
            const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json(utxos);
            const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
            const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
            const creationHeight = await currentHeight();
            const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();

            // rebuild the sell reserve
            const sellReserveBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
                reserveBoxWASM.value(), // unchanged
                (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(SELL_FIXED_SCRIPT_ADDRESS)),
                creationHeight);
            const initialReserveTokenAmount = reserveBoxWASM.tokens().get(0).amount().as_i64().to_str();
            const outputReserveTokenAmount = BigInt(initialReserveTokenAmount) - BigInt(tokenBuyAmount);
            if (outputReserveTokenAmount > 0) {
                sellReserveBoxBuilder.add_token( // option token sold
                    reserveBoxWASM.tokens().get(0).id(),
                    (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(outputReserveTokenAmount.toString())),
                );
            }
            sellReserveBoxBuilder.set_register_value(4, reserveBoxWASM.register_value(4));
            sellReserveBoxBuilder.set_register_value(5, reserveBoxWASM.register_value(5));
            sellReserveBoxBuilder.set_register_value(6, reserveBoxWASM.register_value(6));
            try {
                outputCandidates.add(sellReserveBoxBuilder.build());
            } catch (e) {
                console.log(`building error: ${e}`);
                throw e;
            }

            // token delivery box
            const optionDeliveryBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
                (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(tokenDeliveryBoxValue.toString())),
                (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(tokenBuyerAddress)),
                creationHeight);
            optionDeliveryBoxBuilder.add_token( // option
                reserveBoxWASM.tokens().get(0).id(),
                (await ergolib).TokenAmount.from_i64((await ergolib).I64.from_str(tokenBuyAmount.toString())),
            );
            try {
                outputCandidates.add(optionDeliveryBoxBuilder.build());
            } catch (e) {
                console.log(`building error: ${e}`);
                throw e;
            }

            // Issuer pay box
            const issuerPayBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
                (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(minPrice.toString())),
                (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(validSellTokenRequests[0].sellerAddress)),
                creationHeight);
            try {
                outputCandidates.add(issuerPayBoxBuilder.build());
            } catch (e) {
                console.log(`building error: ${e}`);
                throw e;
            }

            // dApp UI Fee
            const dApppUIFeeBoxBuilder = new (await ergolib).ErgoBoxCandidateBuilder(
                (await ergolib).BoxValue.from_i64((await ergolib).I64.from_str(dAppUIFee.toString())),
                (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(validSellTokenRequests[0].dAppUIAddress)),
                creationHeight);
            try {
                outputCandidates.add(dApppUIFeeBoxBuilder.build());
            } catch (e) {
                console.log(`building error: ${e}`);
                throw e;
            }

            const tx = await createTransaction(boxSelection, outputCandidates, [], DAPP_UI_ADDRESS, utxos, txFee);
            //console.log("processFixedBuyRequest tx", JSONBigInt.stringify(tx, null, 4));
            const wallet = (await ergolib).Wallet.from_mnemonic("", "");
            const signedTxTmp = await signTransaction(tx, utxos, [], wallet);
            const signedTx = JSONBigInt.parse(signedTxTmp);
            const txId = await sendTx(signedTx);
            return txId;

            //console.log("buyMaxPrice", buyMaxPrice, sellOptionList, tokenBuyAmount)
        } else {
            console.log("NO SELL request found for " + buyRequest.full.boxId);
        }
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
        //console.log("create option request tx", tx)
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


export async function closeEmptySellToken(sellRequest) {
    try {
        const inputsWASM = (await ergolib).ErgoBoxes.from_boxes_json([sellRequest.full]);
        const dataListWASM = new (await ergolib).ErgoBoxAssetsDataList();
        const boxSelection = new (await ergolib).BoxSelection(inputsWASM, dataListWASM);
        const outputCandidates = (await ergolib).ErgoBoxCandidates.empty();
        //const tokenAmountAdjusted = BigInt(tokAmount * Math.pow(10, tokDecimals)).toString();

        var tx = await createTransaction(boxSelection, outputCandidates, [], sellRequest.sellerAddress, [sellRequest.full], sellRequest.txFee);
        //console.log("closeEmptySellToken tx", tx)
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
