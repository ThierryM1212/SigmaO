import { decodeHex, decodeLongArray, sigmaPropToAddress } from '../ergo-related/serializer.js';
import { getRegisterValue } from '../ergo-related/wasm.js';
import { OptionDef } from './OptionDef.js';
import JSONBigInt from 'json-bigint';
import { getOptionPrice } from '../utils/utils.js';
import { getOraclePrice, searchUnspentBoxes } from '../ergo-related/explorer.js';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants.js';
import { Option } from './Option.js';
let ergolib = import('ergo-lib-wasm-nodejs');

/* global BigInt */


export class SellOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.sellerAddress = '';
        this.option = undefined;
        this.optionAmount = 0;
        this.sigma = 500;
        this.K1 = 100;
        this.K2 = 200;
        this.freezeDelay = 1;
        this.dAppUIFee = 1;
        this.currentOraclePrice = undefined;
        this.currentOptionPrice = undefined;
        this.isFrozen = false;
    }

    async initialize() {
        this.sellerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(this.full));
        const optionIssuerBox = JSONBigInt.parse(boxWASM.register_value(5).to_ergo_box().to_json());
        const optionDef = await OptionDef.create(optionIssuerBox);
        const optionReserveBoxes = await searchUnspentBoxes(OPTION_SCRIPT_ADDRESS, [optionDef.optionTokenId]);
        if (optionReserveBoxes.length > 0) {
            this.option = await Option.create(optionReserveBoxes[0]);
        } else {
            this.option = await Option.create(optionIssuerBox);
        }
        

        if (this.full.assets.length > 0) {
            if (this.full.assets[0].tokenId === optionDef.optionTokenId) {
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
        const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === optionDef.underlyingTokenId)
        this.currentOraclePrice = await getOraclePrice(underlyingToken.oracleNFTID);
        this.isFrozen = new Date().valueOf() > optionDef.maturityDate - this.freezeDelay;
        if(this.currentOraclePrice) {
            this.currentOptionPrice = getOptionPrice(optionDef.optionType, optionDef.optionStyle, (new Date()).valueOf(), optionDef.maturityDate, this.currentOraclePrice, 
                optionDef.strikePrice * Math.pow(10, underlyingToken.decimals), optionDef.shareSize, this.sigma, this.K1, this.K2);
        }
        //console.log("SellOptionRequest initialize", this)
    }

    static async create(boxJSON) {
        const o = new SellOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
