import openIcon from "../images/open_in_new_white_24dp.svg";
import { DEFAULT_EXPLORER_ADDRESS } from "../utils/constants";
import { formatLongString } from "../utils/utils";


export default function AddressLink(props) {
    return (
        <div className="d-flex flew-row">
            <div>{formatLongString(props.address, 8)}</div>
            &nbsp;
            <a href={DEFAULT_EXPLORER_ADDRESS + 'en/addresses/' + props.address} target="_blank" rel="noreferrer">
                <img src={openIcon} width="20" height="20" className="d-inline-block align-top" alt={props.url} />
            </a>
        </div>
    )
}