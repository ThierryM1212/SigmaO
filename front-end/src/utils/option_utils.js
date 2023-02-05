import { boxByIdv1 } from "../ergo-related/explorer";
import { OptionDef } from "../objects/OptionDef";
import { OPTION_SCRIPT_ADDRESS } from "./script_constants";

export async function getWalletOptionsDef(walletTokens) {
    const walletTokenIds = walletTokens.map(tok => tok.tokenId)
    const tokensIssuingBox = await Promise.all(walletTokenIds.map(async tokenId => await boxByIdv1(tokenId)));
    const walletOptionIssuingBoxes = tokensIssuingBox.filter(b => b.address === OPTION_SCRIPT_ADDRESS);
    const walletOptionDefs = await Promise.all(walletOptionIssuingBoxes.map(async b => await OptionDef.create(b)));
    return walletOptionDefs;
}