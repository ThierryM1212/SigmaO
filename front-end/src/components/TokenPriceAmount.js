import { formatERGAmount } from "../utils/utils";


export default function TokenPriceAmount(props) {
    return (
        <div className="w-100">
            <div className="w-100 d-flex flex-row justify-content-between">
                <div>Price</div>
                <div>{formatERGAmount(parseInt(props.tokenPrice) * props.tokenDecimalFactor)}</div>
            </div>
            <div className="w-100 d-flex flex-row justify-content-between">
                <div>Amount</div>
                <div>{Math.round(props.tokenAmount / props.tokenDecimalFactor)}</div>
            </div>
        </div>
    )
}
