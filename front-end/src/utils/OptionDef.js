import { getExplorerBlockHeaders, getOraclePrice } from '../ergo-related/explorer';
import { decodeHex, decodeLongArray, decodeString, ergoTreeToAddress, sigmaPropToAddress, toHexString } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { UNDERLYING_TOKENS } from './constants';
import { getOptionPrice, maxBigInt } from './utils';

/* global BigInt */


export class OptionDef {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.underlyingTokenId = '';
        this.optionName = '';
        this.dAppUIErgotree = '';
        this.dAppUIAddress = '';
        this.optionType = 0;
        this.optionStyle = 0;
        this.shareSize = 1;
        this.maturityDate = new Date().valueOf();
        this.sigma = 1;
        this.K1 = 1;
        this.K2 = 1;
        this.strikePrice = 1;
        this.dAppUIFee = 1;
        this.dAppUIMintFee = 1;
        this.issuerAddress = '';
        this.address = '';
        this.currentOraclePrice = 1;
        this.currentOptionPrice = 1;
        this.isProcessed = false;
    }

    async initialize() {
        this.optionName = await decodeString(getRegisterValue(this.full, "R4"));
        this.dAppUIErgotree = await decodeHex(getRegisterValue(this.full, "R5"));
        this.dAppUIAddress = await ergoTreeToAddress(this.dAppUIErgotree);
        const optionParams = await decodeLongArray(getRegisterValue(this.full, "R8"))
        this.optionType = optionParams[0];
        this.optionStyle = optionParams[1];
        this.shareSize = optionParams[2];
        this.maturityDate = optionParams[3];
        this.sigma = optionParams[4];
        this.K1 = optionParams[5];
        this.K2 = optionParams[6];
        this.strikePrice = optionParams[7];
        this.dAppUIFee = optionParams[8];
        this.dAppUIMintFee = optionParams[9];
        this.issuerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R9"));
        this.address = await ergoTreeToAddress(this.full.ergoTree);
        this.underlyingTokenId = UNDERLYING_TOKENS.find(tok => tok.optionScriptAddress === this.address).tokenId
        this.currentOraclePrice = await getOraclePrice(UNDERLYING_TOKENS.find(tok => tok.tokenId === this.underlyingTokenId).oracleNFTID);
        const ergoContext = await getExplorerBlockHeaders();
        this.currentOptionPrice = this.getOptionPrice(ergoContext[0].timestamp, this.currentOraclePrice);
    }

    getOptionPrice(unixDate, underlyingPrice) {
        const currentOptionPrice = getOptionPrice(this.optionType, this.optionStyle, unixDate, this.maturityDate, underlyingPrice, this.strikePrice, this.shareSize, this.sigma, this.K1, this.K2);
        return currentOptionPrice.toString();
    }


    static async create(boxJSON) {
        const o = new OptionDef(boxJSON);
        await o.initialize();
        return o;
    }
}
