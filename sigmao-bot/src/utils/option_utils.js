import { OPTION_TYPES } from "./constants.js";


export function getOptionName(optionType, optionStyle, underlyingTokenName, strikePrice, maturityDate, shareSize) {
    var optionStyleLetter = 'E';
    if (optionStyle === 1) {
        optionStyleLetter = 'A';
    }
    var optionTypeText = OPTION_TYPES.find(o => o.id === optionType).label;

    const optionName = optionTypeText + "_" + optionStyleLetter + "_" + underlyingTokenName + "_ERG_" + strikePrice + "_" + maturityDate.toISOString().substring(0, 10) + "_per_" + shareSize;
    return optionName;
}
