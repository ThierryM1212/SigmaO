import { OptionDef } from './OptionDef';
import JSONBigInt from 'json-bigint';
import { decodeLongArray } from '../ergo-related/serializer';
import { getRegisterValue, getTokenAmount } from '../ergo-related/wasm';
import { PEER_BOX_SCRIPT_ADDRESS } from '../utils/script_constants';
import { boxById, getTransactionById, searchUnspentBoxesUpdated } from '../ergo-related/explorer';
import { PeerBox } from './PeerBox';
let ergolib = import('ergo-lib-wasm-browser');


export class Option {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.optionDef = undefined;
        this.isMinted = false;
        this.isDelivered = false;
        this.isEmpty = false;
        this.exercibleOptionAmount = 0;
        this.totalMintedOptions = 0;
        this.totalExercisedOptions = 0;
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
        if (this.isMinted) {
            const optionState = await decodeLongArray(getRegisterValue(this.full, "R8"))
            this.totalMintedOptions = optionState[0];
            this.totalExercisedOptions = optionState[1];
        }
        if (this.optionDef.isExercible) {
            this.exercibleOptionAmount = this.totalMintedOptions - this.totalExercisedOptions;
            //console.log("exercibleOptionAmount ", this.exercibleOptionAmount)
        }
        this.isEmpty = (this.totalMintedOptions === this.totalExercisedOptions)
        console.log("totalMintedOptions totalExercisedOptions", this.totalMintedOptions, this.totalExercisedOptions)
        //console.log("initialize", this)
    }

    async getPeerBox() {
        if (!this.isMinted) {
            return this.optionDef.getPeerBox();
        } else {
            // Get the peerbox used to mint the option tokens
            console.log("this", this)
            const mintOptionBox = await boxById(this.optionDef.optionTokenId);
            console.log("mintOptionBox", mintOptionBox)
            const mintTx = await getTransactionById(mintOptionBox.spentTransactionId)
            console.log("getPeerBox mintTx", mintTx)
            const peerBox = await PeerBox.create(mintTx.inputs[1])
            return peerBox
        }
    }

    static async create(boxJSON) {
        const o = new Option(boxJSON);
        await o.initialize();
        return o;
    }
}
