import { decodeHex, decodeLong, sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';

/* global BigInt */


export class BuyOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.buyerAddress = '';
        this.optionTokenID = '';
        this.optionAmount = '0';
        this.maxTotalPrice = '0';
    }

    async initialize() {
        this.buyerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.optionTokenID = await decodeHex(getRegisterValue(this.full, "R5"));
        this.optionAmount = await decodeLong(getRegisterValue(this.full, "R6"));
        this.maxTotalPrice = this.full.value;
    }

    static async create(boxJSON) {
        const o = new BuyOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
