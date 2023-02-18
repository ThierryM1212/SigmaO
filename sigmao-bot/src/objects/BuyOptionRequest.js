import { decodeHex, decodeLong, sigmaPropToAddress } from '../ergo-related/serializer.js';
import { getRegisterValue } from '../ergo-related/wasm.js';


/* global BigInt */


export class BuyOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.buyerAddress = '';
        this.optionTokenId = '';
        this.optionAmount = '0';
        this.buyRequestValue = '0';
    }

    async initialize() {
        this.buyerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.optionTokenId = await decodeHex(getRegisterValue(this.full, "R5"));
        this.optionAmount = await decodeLong(getRegisterValue(this.full, "R6"));
        this.buyRequestValue = this.full.value;
    }

    static async create(boxJSON) {
        const o = new BuyOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
