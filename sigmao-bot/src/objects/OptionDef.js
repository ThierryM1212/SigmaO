import { getTokenInfo } from '../ergo-related/explorer.js';
import { decodeHex, decodeHexArray, decodeLongArray, decodeString, ergoTreeToAddress } from '../ergo-related/serializer.js';
import { getRegisterValue } from '../ergo-related/wasm.js';
import { TX_FEE } from '../utils/constants.js';
import { UNDERLYING_TOKENS } from '../utils/script_constants.js';
let ergolib = import('ergo-lib-wasm-nodejs');
/* global BigInt */


export class OptionDef {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.optionTokenId = boxJSON.boxId;
        this.underlyingTokenId = '';
        this.underlyingTokenInfo = undefined;
        this.optionName = '';
        this.dAppUIErgotree = '';
        this.dAppUIAddress = '';
        this.optionType = 0;
        this.optionStyle = 0;
        this.shareSize = 1;
        this.maturityDate = new Date().valueOf();
        this.strikePrice = 1;
        this.dAppUIMintFee = 1;
        this.issuerAddress = '';
        this.address = '';
        this.txFee = TX_FEE;
        this.isExpired = false;
        this.isExercible = false;
    }

    async initialize() {
        //console.log("initialize", this)
        this.optionName = await decodeString(getRegisterValue(this.full, "R4"));
        this.underlyingTokenId = await decodeHex(getRegisterValue(this.full, "R5"));
        this.underlyingTokenInfo = await getTokenInfo(this.underlyingTokenId);
        const R9 = await decodeHexArray(getRegisterValue(this.full, "R9"));
        this.issuerErgotree = R9[0];
        this.issuerAddress = (await ergolib).Address.p2pk_from_pk_bytes(Buffer.from(this.issuerErgotree, 'hex')).to_base58();
        this.dAppUIErgotree = R9[1];
        this.dAppUIAddress = await ergoTreeToAddress(this.dAppUIErgotree);
        const optionParams = await decodeLongArray(getRegisterValue(this.full, "R8"))
        this.optionType = optionParams[0];
        this.optionStyle = optionParams[1];
        this.shareSize = optionParams[2];
        this.maturityDate = optionParams[3];
        this.strikePrice = optionParams[4];
        this.dAppUIMintFee = optionParams[5];
        this.txFee = optionParams[6];
        this.address = await ergoTreeToAddress(this.full.ergoTree);

        const now = new Date().valueOf();
        const maturityDate = this.maturityDate;
        //console.log("isExpired", now, maturityDate)
        if (now > maturityDate) {
            this.isExpired = true;
        }
        if (this.optionStyle === 0) { // European
            // Exercible 24h after
            if (now > maturityDate && now < maturityDate + 24 * 3600 * 1000) {
                this.isExercible = true;
            }

        } else { // American
            this.isExercible = !this.isExpired
        }
        

        //console.log("initialize", this)
    }

    getIntrinsicPrice(oraclePrice) {
        const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === this.underlyingTokenId);
        if (this.optionType === 0) { // Call
            return Math.max(0, (oraclePrice - this.strikePrice * Math.pow(10, underlyingToken.decimals)) * this.shareSize);
        } else {
            return Math.max(0, (this.strikePrice * Math.pow(10, underlyingToken.decimals) - oraclePrice) * this.shareSize);
        }
    }

    static async create(boxJSON) {
        const o = new OptionDef(boxJSON);
        await o.initialize();
        return o;
    }
}
