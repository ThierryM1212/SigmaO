import { OptionDef } from './OptionDef';
import JSONBigInt from 'json-bigint';
import { MIN_NANOERG_BOX_VALUE } from '../utils/constants';
let ergolib = import('ergo-lib-wasm-browser');
/* global BigInt */


export class Option {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.optionDef = undefined;
        this.isMinted = false;
        this.isDelivered = false;
        this.isExpired = false;
        this.isExercible = false;
        this.isEmpty = false;
    }

    async initialize() {
        const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(this.full));
        const creationBoxJSON = JSONBigInt.parse(boxWASM.register_value(7).to_ergo_box().to_json());
        if (this.full.ergoTree === creationBoxJSON.ergoTree) {
            if (this.full.assets.length > 0) {
                if (this.full.assets[0].tokenId === creationBoxJSON.boxId) {
                    this.isMinted = true;
                    try {
                        this.optionDef = await OptionDef.create(creationBoxJSON);
                    } catch (e) {
                        console.log("Failed to initialize option 1", e)
                        return;
                    }
                    
                    if (this.full.assets[0].amount === 1) {
                        this.isDelivered = true;
                        const now = new Date().valueOf();
                        const maturityDate = this.optionDef.maturityDate;
                        if (now > maturityDate) {
                            this.isExpired = true;
                        }
                        if (this.optionDef.optionStyle === 0) { // European
                            // Exercible 24h after
                            if (now > maturityDate && now < maturityDate + 24 * 3600 * 1000) {
                                this.isExercible = true;
                            }

                        } else { // American
                            this.isExercible = !this.isExpired
                        }
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
                }
            } else {
                console.log("Failed to initialize option 2")
            }
        } else {
            try {
                this.optionDef = await OptionDef.create(this.full);
            } catch (e) {
                console.log("Failed to initialize option 3", e)
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
