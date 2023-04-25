import { boxByIdv1, getOraclePrice, getTokenInfo } from '../ergo-related/explorer';
import { decodeHex, decodeLongArray, ergoTreeToAddress, sigmaPropToAddress } from '../ergo-related/serializer';
import { getRegisterValue } from '../ergo-related/wasm';
import { DAPP_UI_ERGOTREE, DAPP_UI_FEE, TX_FEE } from '../utils/constants';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { OptionDef } from './OptionDef';


export class SellTokenRequest {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.sellerAddress = '';
        this.tokenId = '';
        this.tokenAmount = 0;
        this.tokenPrice = 0;
        this.dAppUIFee = DAPP_UI_FEE;
        this.dAppUIErgoTree = DAPP_UI_ERGOTREE;
        this.dAppUIAddress = '';
        this.txFee = TX_FEE;
        this.tokenInfo = undefined;
        this.currentOraclePrice = undefined;
        this.optionDef = undefined;
    }

    async initialize() {
        this.sellerAddress = await sigmaPropToAddress(getRegisterValue(this.full, "R4"));
        const sellParams = await decodeLongArray(getRegisterValue(this.full, "R5"));
        const dAppUIErgoTree = await decodeHex(getRegisterValue(this.full, "R6"));
        this.dAppUIErgoTree = dAppUIErgoTree;
        //console.log("dAppUIErgoTree", dAppUIErgoTree);
        this.dAppUIAddress = await ergoTreeToAddress(dAppUIErgoTree);

        this.tokenPrice = sellParams[0];
        this.dAppUIFee = sellParams[1];
        this.txFee = sellParams[2];
        this.sellRequestValue = this.full.value;
        if (this.full.assets.length > 0) {
            console.log("this.full.assets[0]", this.full.assets[0])
            this.tokenId = this.full.assets[0].tokenId;
            this.tokenAmount = this.full.assets[0].amount;
            this.tokenInfo = await getTokenInfo(this.tokenId);
            const oracleNFTID = UNDERLYING_TOKENS.find(t => t.tokenId === this.tokenId)?.oracleNFTID;
            if (oracleNFTID) {
                this.currentOraclePrice = await getOraclePrice(oracleNFTID);
            }
        }
        const issuerBox = await boxByIdv1(this.tokenId);
        if (issuerBox.address === OPTION_SCRIPT_ADDRESS) {
            this.optionDef = await OptionDef.create(issuerBox);
        }
    }

    static async create(boxJSON) {
        const o = new SellTokenRequest(boxJSON);
        await o.initialize();
        return o;
    }
}
