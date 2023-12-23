import JSONBigInt from 'json-bigint';
import { boxByIdv1, getTokenInfo, searchUnspentBoxesUpdated } from '../ergo-related/explorer';
import { decodeHex, decodeHexArray, decodeLongArray, decodeString, ergoTreeToAddress } from '../ergo-related/serializer';
import { getRegisterValue, getTokenAmount } from '../ergo-related/wasm';
import { TX_FEE } from '../utils/constants';
import { OPTION_SCRIPT_ADDRESS, PEER_BOX_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { PeerBox } from './PeerBox';
let ergolib = import('ergo-lib-wasm-browser');


export class OptionDef {
    constructor(boxJSON) {
        this.full = boxJSON;
        this.optionTokenId = boxJSON.boxId;
        this.underlyingTokenId = '';
        this.underlyingTokenInfo = undefined;
        this.optionName = '';
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
        this.isExpired = false;
        this.isExercible = false;
        this.isCompoundOption = false;
        this.underlyingOptionDef = undefined;
        this.initERGAmount = boxJSON.value;
        this.initTokenAmount = 0;
    }

    async initialize() {
        //console.log("initialize", this)
        this.optionName = await decodeString(getRegisterValue(this.full, "R4"));
        this.underlyingTokenId = await decodeHex(getRegisterValue(this.full, "R5"));
        this.underlyingTokenInfo = await getTokenInfo(this.underlyingTokenId);
        const underlyingTokenIssuingBox = await boxByIdv1(this.underlyingTokenId);
        if (underlyingTokenIssuingBox.address === OPTION_SCRIPT_ADDRESS) {
            this.isCompoundOption = true;
            this.underlyingOptionDef = await OptionDef.create(underlyingTokenIssuingBox);
        }
        const R9 = await decodeHexArray(getRegisterValue(this.full, "R9"));
        this.issuerErgotree = R9[0];
        this.issuerAddress = (await ergolib).Address.p2pk_from_pk_bytes(Buffer.from(this.issuerErgotree, 'hex')).to_base58();
        this.dAppUIErgotreeHash = R9[1];
        this.optionDeliveryErgotreeHash = R9[2];
        this.optionExerciseErgotreeHash = R9[3];
        this.optionCloseErgotreeHash = R9[4];
        const optionParams = await decodeLongArray(getRegisterValue(this.full, "R8"));
        this.optionParams = optionParams;
        this.optionType = optionParams[0];
        this.optionStyle = optionParams[1];
        this.shareSize = optionParams[2];
        this.maturityDate = optionParams[3];
        this.strikePrice = optionParams[4];
        this.dAppUIMintFee = optionParams[5];
        this.txFee = optionParams[6];
        this.address = await ergoTreeToAddress(this.full.ergoTree);

        if (this.optionType === 0) { // Call
            this.initTokenAmount = getTokenAmount(this.full, this.underlyingTokenId)
        }

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
        console.log("initialize", this)
    }

    getIntrinsicPrice(oraclePrice) {
        const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === this.underlyingTokenId);
        if (underlyingToken) {
            //console.log("getIntrinsicPrice", oraclePrice, this.strikePrice, this.shareSize)
            if (this.optionType === 0) { // Call
                return Math.max(0, (oraclePrice - this.strikePrice * Math.pow(10, underlyingToken.decimals)) * this.shareSize);
            } else {
                return Math.max(0, (this.strikePrice * Math.pow(10, underlyingToken.decimals) - oraclePrice) * this.shareSize);
            }
        }

    }

    async getPeerBox() {

        // Search the peer box matching the option parameters
        const peerBoxesJSON = await searchUnspentBoxesUpdated(PEER_BOX_SCRIPT_ADDRESS, [],
            {
                "R5": this.underlyingTokenId,
                "R7": JSONBigInt.stringify([this.initERGAmount, this.initTokenAmount]),
                "R8": JSONBigInt.stringify(this.optionParams)
            });
        console.log("getPeerBox0", peerBoxesJSON)
        let peerBoxes = await Promise.all(peerBoxesJSON.map(async b => {
            const peerBox = await PeerBox.create(b);
            return peerBox;
        }))
        console.log("getPeerBox1", peerBoxes, this)
        peerBoxes = peerBoxes.filter(pb => {
            return pb.issuerAddress === this.issuerAddress &&
                pb.dAppUIErgotreeHash === this.dAppUIErgotreeHash &&
                pb.optionDeliveryErgotreeHash === this.optionDeliveryErgotreeHash &&
                pb.optionExerciseErgotreeHash === this.optionExerciseErgotreeHash &&
                pb.optionCloseErgotreeHash === this.optionCloseErgotreeHash
        })
        console.log("getPeerBox2", peerBoxes)
        if (peerBoxes.length > 1) {
            peerBoxes = peerBoxes.filter(pb => {
                return pb.full.transactionId === this.full.transactionId
            })
        }
        console.log("getPeerBox3", peerBoxes)
        if (peerBoxes.length >= 1) {
            return peerBoxes[0];
        }
        console.log("getPeerBox4", peerBoxes)
    }

    static async create(boxJSON) {
        const o = new OptionDef(boxJSON);
        await o.initialize();
        return o;
    }
}
