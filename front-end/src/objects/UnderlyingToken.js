export class UnderlyingToken {
    constructor(label, tokenId, decimals, oracleNFTID, oracleType, optionScriptAddress, sellOptionScriptAddress) {
        this.label = label;
        this.tokenId = tokenId;
        this.decimals = decimals;
        this.oracleNFTID = oracleNFTID;
        this.oracleType = oracleType;
        this.optionScriptAddress = optionScriptAddress;
        this.sellOptionScriptAddress = sellOptionScriptAddress;
      }
}

