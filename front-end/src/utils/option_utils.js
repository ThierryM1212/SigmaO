import { boxByIdv1, getTokensForAddress, searchUnspentBoxes } from "../ergo-related/explorer";
import { Option } from "../objects/Option";
import { OptionDef } from "../objects/OptionDef";
import { OPTION_TYPES } from "./constants";
import { OPTION_SCRIPT_ADDRESS } from "./script_constants";

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
    var optionTypeText = OPTION_TYPES.find(o => o.id === optionType).label;

    const optionName = optionTypeText + "_" + optionStyleLetter + "_" + underlyingTokenName + "_ERG_" + strikePrice + "_" + maturityDate.toISOString().substring(0, 10) + "_per_" + shareSize;
    return optionName;
}
