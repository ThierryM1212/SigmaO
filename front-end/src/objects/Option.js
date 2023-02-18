import { OptionDef } from './OptionDef';
import JSONBigInt from 'json-bigint';
import { MIN_NANOERG_BOX_VALUE } from '../utils/constants';
let ergolib = import('ergo-lib-wasm-browser');


export class Option {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.optionDef = undefined;
        this.isMinted = false;
        this.isDelivered = false;
        this.isEmpty = false;
        this.exercibleOptionAmount = 0;
    }
    
    async initialize() {
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(this.full));
        const creationBoxJSON = JSONBigInt.parse(boxWASM.register_value(7).to_ergo_box().to_json());
        if (this.full.ergoTree === creationBoxJSON.ergoTree) { 
            this.optionDef = await OptionDef.create(creationBoxJSON);
        } else {
            this.optionDef = await OptionDef.create(this.full);
        }

        if (this.full.assets.length > 0) {
            if (this.full.assets[0].tokenId === creationBoxJSON.boxId) {
                this.isMinted = true;
            }
            if (this.full.assets[0].amount === 1) {
                this.isDelivered = true;
            }
        }
        if (this.optionDef.isExercible) {
            if (this.optionDef.optionType === 0) { // call
                const amountTokenReserve = this.full.assets.find(t => t.tokenId === this.optionDef.underlyingTokenId)?.amount ?? 0;
                this.exercibleOptionAmount = amountTokenReserve / (this.optionDef.shareSize * Math.pow(10, this.optionDef.underlyingTokenInfo.decimals))
            } else {
                const amountERGreserve = this.full.value - this.optionDef.txFee - MIN_NANOERG_BOX_VALUE;
                this.exercibleOptionAmount = amountERGreserve / (this.optionDef.strikePrice * this.optionDef.shareSize * Math.pow(10, this.optionDef.underlyingTokenInfo.decimals))
            }
            console.log("exercibleOptionAmount ", this.exercibleOptionAmount)
        }
        if (this.optionDef.optionType === 0) { // Call
            if (this.full.assets.length === 1) {
                this.isEmpty = true;
            }
        } else { // Put
            if (this.full.value === this.optionDef.txFee + MIN_NANOERG_BOX_VALUE) {
                this.isEmpty = true;
            }
        }
        console.log("initialize", this)
    }

    static async create(boxJSON) {
        const o = new Option(boxJSON);
        await o.initialize();
        return o;
    }
}
