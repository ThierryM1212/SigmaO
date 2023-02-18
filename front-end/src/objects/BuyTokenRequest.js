import { getOraclePrice, getTokenInfo } from '../ergo-related/explorer';
import { decodeHex, decodeLong, sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { MIN_NANOERG_BOX_VALUE, TX_FEE } from '../utils/constants';
import { UNDERLYING_TOKENS } from '../utils/script_constants';


export class BuyTokenRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.buyerAddress = '';
        this.tokenId = '';
        this.tokenAmount = '0';
        this.buyRequestValue = '0';
        this.tokenPrice = undefined;
        this.currentOraclePrice = undefined;
        this.tokenInfo = undefined;
    }

    async initialize() {
        this.buyerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.tokenId = await decodeHex(getRegisterValue(this.full, "R5"));
        this.tokenAmount = await decodeLong(getRegisterValue(this.full, "R6"));
        this.buyRequestValue = this.full.value;
        this.tokenPrice = Math.round((this.buyRequestValue - TX_FEE - MIN_NANOERG_BOX_VALUE) / this.tokenAmount);
        const oracleNFTID = UNDERLYING_TOKENS.find(t => t.tokenId === this.tokenId)?.oracleNFTID;
        if (oracleNFTID) {
            this.currentOraclePrice = await getOraclePrice(oracleNFTID);
        }
        this.tokenInfo = await getTokenInfo(this.tokenId);
    }

    static async create(boxJSON) {
        const o = new BuyTokenRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
