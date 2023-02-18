import { getOraclePrice, getTokenInfo } from '../ergo-related/explorer.js';
import { decodeLong, sigmaPropToAddress } from '../ergo-related/serializer.js';
import { getRegisterValue } from '../ergo-related/wasm.js';
import { UNDERLYING_TOKENS } from '../utils/script_constants.js';


export class SellTokenRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.sellerAddress = '';
        this.tokenId = '';
        this.tokenAmount = 0;
        this.tokenPrice = 0;
        this.tokenInfo = undefined;
        this.currentOraclePrice = undefined;
    }

    async initialize() {
        this.sellerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        this.tokenPrice = await decodeLong(getRegisterValue(this.full, "R5"));
        this.sellRequestValue = this.full.value;
        if (this.full.assets.length > 0) {
            this.tokenId = this.full.assets[0].tokenId;
            this.tokenAmount = this.full.assets[0].amount;
            this.tokenInfo = await getTokenInfo(this.tokenId);
            const oracleNFTID = UNDERLYING_TOKENS.find(t => t.tokenId === this.tokenId)?.oracleNFTID;
            if (oracleNFTID) {
                this.currentOraclePrice = await getOraclePrice(oracleNFTID);
            }
        }
    }

    static async create(boxJSON) {
        const o = new SellTokenRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
