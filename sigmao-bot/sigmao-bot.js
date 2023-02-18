import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from './src/utils/script_constants.js';
import { Option } from './src/objects/Option.js';
import { BuyOptionRequest } from './src/objects/BuyOptionRequest.js';
import { getUnspentBoxesForAddressUpdated } from './src/ergo-related/explorer.js';
import { getOptionName } from './src/utils/option_utils.js';
import { closeEmptySellToken, closeOptionExpired, closeSellOption, deliverOption, mintOption, processBuyRequest, processExerciseRequest } from './src/actions/botOptionAction.js';
import { ExerciseOptionRequest } from './src/objects/ExerciseOptionRequest.js';
import dayjs from 'dayjs';
import { SellOptionRequest } from './src/objects/SellOptionRequest.js';
import { BuyTokenRequest } from './src/objects/BuyTokenRequest.js';
import { SellTokenRequest } from './src/objects/SellTokenRequest.js';


async function processOptions() {
    try {
        console.log(dayjs().format());
        const optionBoxes = await getUnspentBoxesForAddressUpdated(OPTION_SCRIPT_ADDRESS);
        const options = await Promise.all(optionBoxes.map(async (b) => await Option.create(b)))

        for (const option of options) {
            const optionDef = option.optionDef;
            const optionName = getOptionName(optionDef.optionType, optionDef.OptionStyle, optionDef.underlyingTokenInfo.name,
                optionDef.strikePrice, new Date(optionDef.maturityDate), optionDef.shareSize);
            if (!option.isMinted) {
                console.log("MINT OPTION " + optionName + " " + optionDef.optionTokenId);
                try {
                    const txId = await mintOption(option.full);
                    console.log("MINT OPTION", optionName, txId);
                } catch (e) {
                    console.log("MINT OPTION", e.toString());
                }
                continue;
            }
            if (!option.isDelivered) {
                console.log("DELIVER OPTION " + optionName + " " + optionDef.optionTokenId);
                try {
                    const txId = await deliverOption(option.full);
                    console.log("DELIVER OPTION", optionName, txId);
                } catch (e) {
                    console.log("DELIVER OPTION", e.toString());
                }
                continue;
            }
            if (option.isEmpty || (optionDef.isExpired && !optionDef.isExercible)) {
                console.log("CLOSE OPTION " + optionName + " " + optionDef.optionTokenId);
                try {
                    const txId = await closeOptionExpired(option.full);
                    console.log("CLOSE OPTION", optionName, txId);
                } catch (e) {
                    console.log("CLOSE OPTION", e.toString());
                }
                continue;
            }
            console.log("NOTHING TO DO OPTION " + optionName + " " + optionDef.optionTokenId);
        }
        // console.log(options);
    } catch (e) {
        console.log(e)
    }
}

async function processBuyRequests() {
    try {
        const buyTokenBoxes = await getUnspentBoxesForAddressUpdated(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS);
        const buyTokensRequests = await Promise.all(buyTokenBoxes.map(async (b) => await BuyTokenRequest.create(b)));
        console.log("buyTokensRequests", buyTokensRequests.length)
        for (const buyTokensRequest of buyTokensRequests) {
            const txId = await processBuyRequest(buyTokensRequest);
            console.log("processBuyRequests PROCESSED ", buyTokensRequest.tokenId, txId);
        }
        if(buyTokensRequests.length === 0) {
            console.log("processBuyRequests NOTHING TO DO");
        }
    } catch (e) {
        console.log(e)
    }
}

async function processExerciseOption() {
    try {
        const exerciseOptionBoxes = await getUnspentBoxesForAddressUpdated(EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS);
        const exerciseOptionsRequests = await Promise.all(exerciseOptionBoxes.map(async (b) => await ExerciseOptionRequest.create(b)));
        for (const exerciseOptionsRequest of exerciseOptionsRequests) {
            const txId = await processExerciseRequest(exerciseOptionsRequest);
            console.log("processExerciseOption PROCESSED ", exerciseOptionsRequest.optionTokenId, txId);
        }
        if(exerciseOptionsRequests.length === 0) {
            console.log("processExerciseOption NOTHING TO DO");
        }
    } catch (e) {
        console.log(e)
    }
}

async function processCloseSellOption() {
    try {
        const sellOptionAddresses = UNDERLYING_TOKENS.map(t=>t.sellOptionScriptAddress);

        const sellOptionBoxes = (await Promise.all(sellOptionAddresses.map(async (a) => await getUnspentBoxesForAddressUpdated(a)))).flat();
        const sellOptionRequests = (await Promise.all(sellOptionBoxes.map(async (b) => await SellOptionRequest.create(b)))).filter(s=> s.optionAmount === 0 
            || s.isFrozen);
        for (const sellOptionRequest of sellOptionRequests) {
            const txId = await closeSellOption(sellOptionRequest);
            console.log("closeSellOption PROCESSED ", sellOptionRequest.option.optionDef.optionName, txId);
        }
        if(sellOptionRequests.length === 0) {
            console.log("closeSellOption NOTHING TO DO");
        }
    } catch (e) {
        console.log(e)
    }
}

async function processCloseEmptySellToken() {
    try {

        const sellTokenBoxes = await getUnspentBoxesForAddressUpdated(SELL_FIXED_SCRIPT_ADDRESS);
        const sellTokenRequests = await Promise.all(sellTokenBoxes.map(async (b) => await SellTokenRequest.create(b)));

        const emptySellTokenRequests = sellTokenRequests.filter(str => str.tokenAmount === 0);

        for (const sellTokenRequest of emptySellTokenRequests) {
            const txId = await closeEmptySellToken(sellTokenRequest);
            console.log("closeEmptySellToken PROCESSED ", txId);
        }
        if(emptySellTokenRequests.length === 0) {
            console.log("closeEmptySellToken NOTHING TO DO");
        }
    } catch (e) {
        console.log(e)
    }
}

closeEmptySellToken

setInterval(processOptions, 30000);
setInterval(processBuyRequests, 31000);
setInterval(processExerciseOption, 32000);
setInterval(processCloseSellOption, 33000);
setInterval(processCloseEmptySellToken, 34000);

