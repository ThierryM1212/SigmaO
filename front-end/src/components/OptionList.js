import LoadingImage from "./LoadingImage";
import OptionCard from "./OptionCard";

export default function OptionList(props) {
    const optionList = props.optionList;
    const walletTokens = props.walletTokens ?? [];
    const underlyingTokenPrices = props.underlyingTokenPrices ?? {};
    return (
        
        <div className='d-flex flex-wrap m-2 p-2 zonemint justify-content-center'>
            {
                optionList ?
                optionList.length > 0 ?
                    optionList.map(option =>
                        <div key={option.optionDef.optionTokenId} className='m-1 p-1'>
                            <OptionCard option={option}
                                oraclePrice={underlyingTokenPrices.find(t => t.tokenId === option.optionDef.underlyingTokenId)?.price}
                                showExercise={true}
                                walletOptionAmount={walletTokens.find(t => t.tokenId === option.optionDef.optionTokenId)?.amount ?? 0}
/>
                        </div>
                    )
                    :
                    <div>No option found</div>
                    :
                    <LoadingImage />
            }
        </div>
    )
}