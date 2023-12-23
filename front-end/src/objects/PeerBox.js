import { decodeHex, decodeHexArray, decodeLongArray, decodeString, ergoTreeToAddress, getErgotreeHash } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { TX_FEE } from '../utils/constants';
let ergolib = import('ergo-lib-wasm-browser');


export class PeerBox {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.underlyingTokenId = '';
        this.optionName = '';
        this.dAppUIErgotree = '';
        this.optionDeliveryErgotree = '';
        this.optionExerciseErgotree = '';
        this.optionCloseErgotree = '';
        this.dAppUIAddress = '';
        this.optionDeliveryAddress = '';
        this.optionExerciseAddress = '';
        this.optionCloseAddress = '';
        this.dAppUIErgotreeHash = '';
        this.optionDeliveryErgotreeHash = '';
        this.optionExerciseErgotreeHash = '';
        this.optionCloseErgotreeHash = '';
        this.optionParams = [];
        this.optionType = 0;
        this.optionStyle = 0;
        this.shareSize = 1;
        this.maturityDate = new Date().valueOf();
        this.strikePrice = 1;
        this.dAppUIMintFee = 1;
        this.issuerAddress = '';
        this.address = '';
        this.txFee = TX_FEE;
        this.optionInitERGAmount = 0;
        this.optionInitTokenAmount = 0;
    }

    async initialize() {
        //console.log("initialize", this)
        this.optionName = await decodeString(getRegisterValue(this.full, "R4"));
        this.underlyingTokenId = await decodeHex(getRegisterValue(this.full, "R5"));

        const optionInitValues = await decodeLongArray(getRegisterValue(this.full, "R7"));
        this.optionInitERGAmount = optionInitValues[0];
        this.optionInitTokenAmount = optionInitValues[1];

        const optionParams = await decodeLongArray(getRegisterValue(this.full, "R8"));
        this.optionParams = optionParams;
        this.optionType = optionParams[0];
        this.optionStyle = optionParams[1];
        this.shareSize = optionParams[2];
        this.maturityDate = optionParams[3];
        this.strikePrice = optionParams[4];
        this.dAppUIMintFee = optionParams[5];
        this.txFee = optionParams[6];

        const R9 = await decodeHexArray(getRegisterValue(this.full, "R9"));
        this.issuerErgotree = R9[0];
        this.issuerAddress = (await ergolib).Address.p2pk_from_pk_bytes(Buffer.from(this.issuerErgotree, 'hex')).to_base58();
        
        this.dAppUIErgotree = R9[1];
        this.optionDeliveryErgotree = R9[2];
        this.optionExerciseErgotree = R9[3];
        this.optionCloseErgotree = R9[4];

        this.dAppUIErgotreeHash = getErgotreeHash(this.dAppUIErgotree);
        this.optionDeliveryErgotreeHash = getErgotreeHash(this.optionDeliveryErgotree);
        this.optionExerciseErgotreeHash = getErgotreeHash(this.optionExerciseErgotree);
        this.optionCloseErgotreeHash = getErgotreeHash(this.optionCloseErgotree);

        this.dAppUIAddress = await ergoTreeToAddress(this.dAppUIErgotree);
        this.optionDeliveryAddress = await ergoTreeToAddress(this.optionDeliveryErgotree);
        this.optionExerciseAddress = await ergoTreeToAddress(this.optionExerciseErgotree);
        this.optionCloseAddress = await ergoTreeToAddress(this.optionCloseErgotree);
        
    }

    static async create(boxJSON) {
        const o = new PeerBox(boxJSON);
        await o.initialize();
        return o;
    }
}
