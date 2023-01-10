import { getBlob } from "../ergo-related/rest";
import { NANOERG_TO_ERG } from "./constants";
import { createHash } from "crypto";

/* global BigInt */


export function formatLongString(str, num) {
    if (typeof str !== 'string') return str;
    if (str.length > 2 * num) {
        return str.substring(0, num) + "..." + str.substring(str.length - num, str.length);
    } else {
        return str;
    }
}

export function formatERGAmount(amountStr) {
    return parseFloat(parseInt(amountStr) / NANOERG_TO_ERG).toFixed(4);
}

export async function downloadAndSetSHA256(url) {
    try {
        const blob = await getBlob(url);
        const hash = createHash('sha256').update(new Uint8Array(blob)).digest('hex');
        console.log("HASH", hash)
        return hash;
    } catch(e) {
        console.log(e)
    }
    return "";
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

export function getOptionPrice(optionType, currentDateUNIX, maturityDate, currentOraclePrice, strikePrice, shareSize, sigma, K1, K2) {
    try {
        const remainingDuration = BigInt(maturityDate) - BigInt(currentDateUNIX);

        const intrinsicPrice = maxBigInt(BigInt(0), (BigInt(currentOraclePrice) - BigInt(strikePrice)) * BigInt(shareSize));
        const SQRT = [
            [BigInt(0), BigInt(0)],
            [BigInt(3600000), BigInt(1897)],
            [BigInt(14400000), BigInt(3795)],
            [BigInt(86400000), BigInt(9295)],
            [BigInt(172800000), BigInt(13145)],
            [BigInt(432000000), BigInt(20785)],
            [BigInt(864000000), BigInt(29394)],
            [BigInt(1728000000), BigInt(41569)],
            [BigInt(2592000000), BigInt(50912)],
            [BigInt(5184000000), BigInt(72000)],
            [BigInt(12960000000), BigInt(113842)],
            [BigInt(20736000000), BigInt(144000)],
            [BigInt(31536000000), BigInt(177584)],
            [BigInt(47304000000), BigInt(217495)],
            [BigInt(63072000000), BigInt(251141)],
            [BigInt(94608000000), BigInt(307584)],
    
        ];
        //console.log("getOptionPrice0", remainingDuration, currentOraclePrice, intrinsicPrice)
        const indSQRT = SQRT.findIndex(point => point[0] >= remainingDuration);
    
        const afterPoint = SQRT[indSQRT];
        const beforePoint = SQRT[indSQRT - 1];
        const sqrtDuration = beforePoint[1] + (afterPoint[1] - beforePoint[1]) * (remainingDuration - beforePoint[0]) / (afterPoint[0] - beforePoint[0]);
        //console.log("getOptionPrice1", beforePoint, afterPoint, sqrtDuration, Math.sqrt(parseInt(remainingDuration)))
        const maxTimeValue = (BigInt(4) * BigInt(sigma) * BigInt(shareSize) * BigInt(strikePrice) * sqrtDuration) / (BigInt(10) * BigInt(1000) * BigInt(177584))
        const priceSpread = maxBigInt(BigInt(currentOraclePrice) - BigInt(strikePrice), BigInt(strikePrice) - BigInt(currentOraclePrice))
        //console.log("getOptionPrice2", maxTimeValue, priceSpread)
        const europeanTimeValue = maxBigInt(BigInt(0), maxTimeValue - (maxTimeValue * BigInt(K1) * priceSpread) / (BigInt(1000) * BigInt(strikePrice)))
        const americanTimeValue = europeanTimeValue + (europeanTimeValue * BigInt(K2) * sqrtDuration) / (BigInt(1000) * BigInt(177584))
        //console.log("getOptionPrice3", europeanTimeValue, americanTimeValue, americanTimeValue - europeanTimeValue, parseFloat(sqrtDuration) / 177584)
        var optionPrice = intrinsicPrice + europeanTimeValue;
        if (optionType === 1) { // american
            optionPrice = intrinsicPrice + americanTimeValue;
        }
        optionPrice = optionPrice - optionPrice % BigInt(10000)
        //console.log("getOptionPrice4", optionPrice)
        return optionPrice;
    } catch(e) {
        console.log("Error getOptionPrice", e);
        return BigInt(0);
    }
    
}