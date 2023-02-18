import { boxByIdv1 } from '../ergo-related/explorer.js';
import { sigmaPropToAddress } from '../ergo-related/serializer.js';
import { getRegisterValue } from '../ergo-related/wasm.js';
import { OptionDef } from './OptionDef.js';

/* global BigInt */


export class ExerciseOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.exerciseAddress = '';
        this.optionTokenId = '';
        this.optionAmount = '0';
        this.value = '0';
        this.optionDef = undefined;
    }

    async initialize() {
        this.exerciseAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.optionTokenId = this.full.assets[0].tokenId ?? '';
        if (this.optionTokenId !== '') {
            const optionIssuerBox = await boxByIdv1(this.optionTokenId);
            this.optionDef = await OptionDef.create(optionIssuerBox);
        }
        if (this.full.assets.length > 0) {
            this.optionAmount = this.full.assets[0].amount;
        }
        
        this.value = this.full.value;
    }

    static async create(boxJSON) {
        const o = new ExerciseOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
