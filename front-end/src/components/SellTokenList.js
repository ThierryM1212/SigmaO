import LoadingImage from "./LoadingImage";
import SellTokenCard from "./SellTokenCard";

export default function SellTokenList(props) {
    return (
        <div className='d-flex flex-column zonemint'>
            {
                props.sellTokenRequestsList ?
                props.sellTokenRequestsList.length > 0 ?
                <div className='d-flex flex-wrap m-2 p-2 zonemint justify-content-center'>
                    {
                        props.sellTokenRequestsList.map(str =>
                            <SellTokenCard key={str.full.boxId}
                                sellTokenRequest={str} />
                        )
                    }
                </div>
                    :
                    <div className='m-2 p-2 '>No tokens on sale</div>
                    :
                    <LoadingImage />
            }
        </div>
    )
}