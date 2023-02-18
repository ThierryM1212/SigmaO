import LoadingImage from "./LoadingImage";
import SellOptionCard from "./SellOptionCard";

export default function SellOptionList(props) {
    return (

        <div className='d-flex flex-wrap m-2 p-2 zonemint justify-content-center'>
            {
                props.sellOptionRequestsList ?
                props.sellOptionRequestsList.length > 0 ?
                props.sellOptionRequestsList.map(sellOptionRequest =>
                        <div key={sellOptionRequest.full.boxId} className='m-1 p-1'>
                            <SellOptionCard key={sellOptionRequest.full.boxId}
                                sellOptionRequest={sellOptionRequest}
                            />
                        </div>
                    )
                    :
                    <div className='d-flex flex-wrap m-2 p-2'>No options on sale</div>
                    :
                    <LoadingImage /> 
            }
        </div>
    )
}