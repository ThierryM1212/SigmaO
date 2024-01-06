import { boxByIdv1, getTokensForAddress, searchUnspentBoxes } from "../ergo-related/explorer";
import { Option } from "../objects/Option";
import { OptionDef } from "../objects/OptionDef";
import { NANOERG_TO_ERG, OPTION_TYPES } from "./constants";
import { OPTION_SCRIPT_ADDRESS } from "./script_constants";
import { formatERGAmount } from "./utils";

export async function getWalletOptionsDef(address) {
    const walletTokens = await getTokensForAddress(address);
    const walletTokenIds = walletTokens.map(tok => tok.tokenId)
    const tokensIssuingBox = await Promise.all(walletTokenIds.map(async tokenId => await boxByIdv1(tokenId)));
    const walletOptionIssuingBoxes = tokensIssuingBox.filter(b => b.address === OPTION_SCRIPT_ADDRESS);

    const walletOptionDefs = await Promise.all(walletOptionIssuingBoxes.map(async b => await OptionDef.create(b)));
    return walletOptionDefs;
}

export async function getWalletOptions(address) {
    const walletTokens = await getTokensForAddress(address);
    const walletTokenIds = walletTokens.map(tok => tok.tokenId)
    const tokensIssuingBox = await Promise.all(walletTokenIds.map(async tokenId => await boxByIdv1(tokenId)));
    const walletOptionTokenId = tokensIssuingBox.filter(b => b.address === OPTION_SCRIPT_ADDRESS).map(b => b.boxId);
    const walletOptionBoxes = (await Promise.all(walletOptionTokenId.map(async tokenId => await searchUnspentBoxes(OPTION_SCRIPT_ADDRESS, [tokenId]))))
    .flat()
    .filter((value, index, self) => index === self.findIndex((t) => (
        t.boxId === value.boxId
    )));;

    const walletOptions = await Promise.all(walletOptionBoxes.map(async b => await Option.create(b)));
    return walletOptions.filter(o => walletTokens.findIndex(t=>t.tokenId === o.optionDef.optionTokenId) >= 0);
}

export function getOptionName(optionType, optionStyle, underlyingTokenName, strikePrice, maturityDate, shareSize) {
    var optionStyleLetter = 'E';
    if (optionStyle === 1) {
        optionStyleLetter = 'A';
    }
    var optionTypeLetter = 'C';
    if (optionType === 1) {
        optionTypeLetter = 'P';
    }
    var strikePriceERG = strikePrice / NANOERG_TO_ERG;
    const optionName = optionStyleLetter + optionTypeLetter + "_" + shareSize + "_" + underlyingTokenName + "_" + strikePriceERG + "_ERG_" +  maturityDate.toISOString().substring(0, 10);
    //console.log("getOptionName", optionName);
    return optionName;
}
