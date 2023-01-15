import { boxById } from '../ergo-related/explorer';
import { sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { OptionDef } from './OptionDef';

/* global BigInt */


export class ExerciseOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.exerciseAddress = '';
        this.optionTokenID = '';
        this.optionAmount = '0';
        this.value = '0';
        this.optionDef = undefined;
    }

    async initialize() {
        this.exerciseAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.optionTokenID = this.full.assets[0].tokenId ?? '';
        if (this.optionTokenID !== '') {
            const optionIssuerBox = await boxById(this.optionTokenID);
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
