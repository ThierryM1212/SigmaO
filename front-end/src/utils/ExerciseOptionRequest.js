import { sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';

/* global BigInt */


export class ExerciseOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.exerciseAddress = '';
        this.optionTokenID = '';
        this.optionAmount = '0';
        this.value = '0';
    }

    async initialize() {
        this.exerciseAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.optionTokenID = this.full.assets[0].tokenId ?? '';
        this.optionAmount = this.full.assets[0].amount ?? '0';;
        this.value = this.full.value;
    }

    static async create(boxJSON) {
        const o = new ExerciseOptionRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
