import { MIN_NANOERG_BOX_VALUE, NANOERG_TO_ERG, SQRTbase } from "./constants";
import blackScholes from "black-scholes";
import Tree from 'option-pricing-tree';

/* global BigInt */


export function formatLongString(str, num) {
    if (typeof str !== 'string') return str;
    if (str.length > 2 * num) {
        return str.substring(0, num) + "..." + str.substring(str.length - num, str.length);
    } else {
        return str;
    }
}

export function formatERGAmount(amountStr, precision = 4) {
    const ergAmount = parseFloat(parseInt(amountStr) / NANOERG_TO_ERG);
    if (ergAmount > 0 && ergAmount < 1 / Math.pow(10, precision)) {
        return amountStr + ' nanoERG'
    } else {
        return parseFloat(parseInt(amountStr) / NANOERG_TO_ERG).toFixed(precision) + " ERG";
    }

}

export function promiseTimeout(ms, promise) {
    // Create a promise that rejects in <ms> milliseconds
    let timeout = new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            clearTimeout(id);
            reject('Timed out in ' + ms + 'ms.')
        }, ms)
    })
    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        promise,
        timeout
    ])
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

export function maxBigInt(...values) {
    if (values.length < 1) {
        return -Infinity;
    }

    let maxValue = values.shift();

    for (const value of values) {
        if (value > maxValue) {
            maxValue = value;
        }
    }

    return maxValue;
}

export function minBigInt(...values) {
    if (values.length < 1) {
        return Infinity;
    }

    let minValue = values.shift();

    for (const value of values) {
        if (value < minValue) {
            minValue = value;
        }
    }

    return minValue;
}

function sqrtBigInt(i) {
    const SQRTBigInt = SQRTbase.map(p => [BigInt(p) * BigInt(p), BigInt(p)]);
    //console.log("getOptionPrice0", remainingDuration, currentOraclePrice, intrinsicPrice)
    const indSQRT = SQRTBigInt.findIndex(point => point[0] >= i);
    var result = BigInt(0);
    if (indSQRT > 0) {
        const afterPoint = SQRTBigInt[indSQRT];
        const beforePoint = SQRTBigInt[indSQRT - 1];
        //console.log(beforePoint, afterPoint)
        const resTmp = beforePoint[1] + (afterPoint[1] - beforePoint[1]) * (i - beforePoint[0]) / (afterPoint[0] - beforePoint[0]);
        result = maxBigInt(BigInt(1), resTmp);
    }

    return result
}

export function getOptionPrice(optionType, optionStyle, currentDateUNIX, maturityDate, currentOraclePrice, strikePrice, shareSize, sigma, K1, K2) {
    //console.log("getOptionPrice", optionType, optionStyle, currentDateUNIX, maturityDate, currentOraclePrice, strikePrice, shareSize, sigma, K1, K2)
    try {
        const remainingDuration = BigInt(maturityDate) - BigInt(currentDateUNIX);

        var intrinsicPrice = maxBigInt(BigInt(0), (BigInt(currentOraclePrice) - BigInt(strikePrice)) * BigInt(shareSize)); // call
        if (optionType === 1) { // put
            intrinsicPrice = maxBigInt(BigInt(0), (BigInt(strikePrice) - BigInt(currentOraclePrice)) * BigInt(shareSize));
        }
        //console.log("intrinsicPrice", intrinsicPrice, strikePrice, currentOraclePrice)

        const sqrtDuration = sqrtBigInt(remainingDuration);
        //console.log("getOptionPrice1", beforePoint, afterPoint, sqrtDuration, Math.sqrt(parseInt(remainingDuration)))
        const maxTimeValue = (BigInt(4) * BigInt(sigma) * BigInt(shareSize) * BigInt(strikePrice) * sqrtDuration) / (BigInt(10) * BigInt(1000) * BigInt(177584))
        const priceSpread = maxBigInt(
            BigInt(currentOraclePrice) - BigInt(strikePrice),
            BigInt(strikePrice) - BigInt(currentOraclePrice)
        )
        const sqrtPriceSpread = sqrtBigInt(priceSpread);
        const sqrtStrikePrice = sqrtBigInt(BigInt(strikePrice));
        //console.log("getOptionPrice2", maxTimeValue, priceSpread)
        const europeanTimeValue = maxBigInt(
            BigInt(0),
            maxTimeValue - (maxTimeValue * BigInt(K1) * sqrtPriceSpread * BigInt(177584)) / (BigInt(1000) * sqrtStrikePrice * maxBigInt(BigInt(1), sqrtDuration))
        )

        const americanTimeValue = europeanTimeValue + (europeanTimeValue * BigInt(K2) * sqrtDuration) / (BigInt(1000) * BigInt(177584))
        //console.log("getOptionPrice3", europeanTimeValue, americanTimeValue, americanTimeValue - europeanTimeValue, parseFloat(sqrtDuration) / 177584)
        var optionPrice = intrinsicPrice + europeanTimeValue;
        if (optionStyle === 1) { // american
            optionPrice = intrinsicPrice + americanTimeValue;
        }
        optionPrice = maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), optionPrice - optionPrice % BigInt(10000)) // round option price, set a minimum
        //console.log("getOptionPrice4", optionPrice)
        if (optionType === 0) { // Call option cannot cost more the underlying asset
            optionPrice = minBigInt(BigInt(currentOraclePrice) * BigInt(shareSize), optionPrice);
        } else { // Put option cannot cost more than the exercise price
            optionPrice = minBigInt(BigInt(strikePrice) * BigInt(shareSize), optionPrice);
        }

        //console.log("getOptionPrice5", optionPrice)
        return optionPrice;
    } catch (e) {
        console.log("Error getOptionPrice", e);
        return BigInt(MIN_NANOERG_BOX_VALUE);
    }

}


export function getOptionPriceBS(optionType, currentDateUNIX, maturityDate, currentOraclePrice, strikePrice, shareSize, sigma) {
    try {
        //blackScholes(s, k, t, v, r, callPut)
        //
        //    s - Current price of the underlying
        //    k - Strike price
        //    t - Time to expiration in years
        //    v - Volatility as a decimal
        //    r - Annual risk-free interest rate as a decimal
        //    callPut - The type of option to be priced - "call" or "put"
        const t = Math.max(0, maturityDate - currentDateUNIX) / (3600 * 1000 * 24 * 365);
        var optionTypeTxt = 'call';
        if (optionType === 1) {
            optionTypeTxt = 'put';
        }
        const optionPrice = blackScholes.blackScholes(currentOraclePrice, strikePrice, t, sigma / 1000, 0, optionTypeTxt);
        return BigInt(Math.round(optionPrice * shareSize));

    } catch (e) {
        console.log("Error getOptionPrice", e);
        return BigInt(0);
    }

}


export function getOptionPriceTree(valuationType, optionType, optionStyle, currentDateUNIX, maturityDate, currentOraclePrice, strikePrice, shareSize, sigma) {

    const t = Math.max(0, maturityDate - currentDateUNIX) / (3600 * 1000 * 24 * 365);
    var optionTypeTxt = 'call';
    if (optionType === 1) {
        optionTypeTxt = 'put';
    }
    var optionStyleTxt = 'european';
    if (optionStyle === 1) {
        optionStyleTxt = 'american';
    }

    // new Tree(tree_type, exercise_style, option_type, expiry_in_years, strike, underlying, vol, rate)
    //      tree_type: Either binomial, or trinomial
    //      exercise_style: Either european or american
    //      option_type: Either call, put, or straddle
    //      expiry_in_years: Eg. 1 for 1y, or 0.5 for 6 months
    //      strike: Strike of the option
    //      underlying: Underlying price
    //      vol: (Implied) Annualized log-normal volatility
    //      rate: Risk-free rate
    //console.log("optionStyleTxt", optionStyleTxt);
    var tree = new Tree(valuationType, optionStyleTxt, optionTypeTxt, t, strikePrice, currentOraclePrice, sigma / 1000, 0);
    var value = tree.build(100);
    return maxBigInt(BigInt(MIN_NANOERG_BOX_VALUE), BigInt(Math.round(value * shareSize)));
}