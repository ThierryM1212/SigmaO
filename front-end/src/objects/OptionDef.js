import { getOraclePrice, getTokenInfo } from '../ergo-related/explorer';
import { decodeHex, decodeHexArray, decodeLongArray, decodeString, ergoTreeToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { TX_FEE } from '../utils/constants';
import { UNDERLYING_TOKENS } from '../utils/script_constants';
let ergolib = import('ergo-lib-wasm-browser');
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
        this.currentOraclePrice = undefined;
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
        const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === this.underlyingTokenId);
        if (underlyingToken) {
            const oracleNFTID = underlyingToken.oracleNFTID;
            this.currentOraclePrice = await getOraclePrice(oracleNFTID);
        }
        //console.log("initialize", this)
    }

    static async create(boxJSON) {
        const o = new OptionDef(boxJSON);
        await o.initialize();
        return o;
    }
}
