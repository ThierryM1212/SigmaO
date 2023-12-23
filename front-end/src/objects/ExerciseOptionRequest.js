import { boxById } from '../ergo-related/explorer';
import { ergoTreeToAddress, sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { OptionDef } from './OptionDef';


export class ExerciseOptionRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.exerciseAddress = '';
        this.issuerAddress = '';
        this.optionTokenId = '';
        this.optionAmount = '0';
        this.value = '0';
        this.optionDef = undefined;
    }

    async initialize() {
        this.issuerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));

        this.exerciseAddress = await ergoTreeToAddress(getRegisterValue(this.full, "R6").slice(4))
        
        this.optionTokenId = this.full.assets[0].tokenId ?? '';
        if (this.optionTokenId !== '') {
            const optionIssuerBox = await boxById(this.optionTokenId);
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
