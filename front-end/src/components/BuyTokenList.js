import BuyTokenCard from "./BuyTokenCard";
import LoadingImage from "./LoadingImage";

export default function BuyTokenList(props) {
    return (
        <div className='d-flex flex-column m-2 p-2 zonemint'>
            {
                props.showTitle ?
                    <h4>Buy requests</h4>
                    :
                    null
            }

            <div className='d-flex flex-wrap m-2 p-2 justify-content-center'>
                {
                    props.buyTokenRequestsList ?
                        props.buyTokenRequestsList.length > 0 ?
                            props.buyTokenRequestsList.map(buyTokenRequest =>
                                <div key={buyTokenRequest.full.boxId} className='m-1 p-1'>
                                    <BuyTokenCard key={buyTokenRequest.full.boxId}
                                        buyTokenRequest={buyTokenRequest}
                                    />
                                </div>
                            )
                            :
                            <div>No token buy requests</div>
                        :
                        <LoadingImage />
                }
            </div>
        </div>
    )
}