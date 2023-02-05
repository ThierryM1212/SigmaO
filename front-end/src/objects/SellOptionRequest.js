import { decodeHex, decodeLong, decodeLongArray, sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { OptionDef } from './OptionDef';
import JSONBigInt from 'json-bigint';
import { getOptionPrice } from '../utils/utils';
import { getOraclePrice } from '../ergo-related/explorer';
import { UNDERLYING_TOKENS } from '../utils/script_constants';
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */


export class SellOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.sellerAddress = '';
        this.optionDef = undefined;
        this.optionAmount = 0;
        this.sigma = 500;
        this.K1 = 100;
        this.K2 = 200;
        this.freezeDelay = 1;
        this.dAppUIFee = 1;
        this.optionCurrentPrice = 0;
    }

    async initialize() {
        this.sellerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(this.full));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(5).to_ergo_box().to_json());
        this.optionDef = await OptionDef.create(optionIssuerBox);
        
        if (this.full.assets.length > 0) {
            if (this.full.assets[0].tokenId === this.optionDef.optionTokenId) {
                this.optionAmount = this.full.assets[0].amount;
            } else {
            this.optionAmount = 0;
        }
        } else {
            this.optionAmount = 0;
        }
        
        const sellParams = await decodeLongArray(getRegisterValue(this.full, "R6"));
        this.sigma = sellParams[0];
        this.K1 = sellParams[1];
        this.K2 = sellParams[2];
        this.freezeDelay = sellParams[3];
        this.dAppUIFee = sellParams[4];
        this.dAppUIErgoTree = await decodeHex(getRegisterValue(this.full, "R7"));
        try {
            const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === this.optionDef.underlyingTokenId)
            const oracleNFTID = underlyingToken.oracleNFTID;
            console.log("oracleNFTID", UNDERLYING_TOKENS, oracleNFTID)
            const currentOraclePrice = await getOraclePrice(oracleNFTID);
            const currentDateUNIX = new Date().valueOf();
            
            this.optionCurrentPrice = getOptionPrice(this.optionDef.optionType, this.optionDef.optionStyle, currentDateUNIX, 
                this.optionDef.maturityDate, currentOraclePrice, this.optionDef.strikePrice * Math.pow(10, underlyingToken.decimals), this.optionDef.shareSize, this.sigma, this.K1, this.K2);
                console.log("this.optionCurrentPrice", this.optionCurrentPrice);
        } catch(e) {
            console.log("SellOptionRequest initialize",e)
        }
        

    }

    static async create(boxJSON) {
        const o = new SellOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
