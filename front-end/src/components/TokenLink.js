import openIcon from "../images/open_in_new_white_24dp.svg";
import verifiedIcon from "../images/verified_white_24dp.svg";
import { DEFAULT_EXPLORER_ADDRESS } from "../utils/constants";
import { UNDERLYING_TOKENS } from "../utils/script_constants";


export default function TokenLink(props) {
    const URL = DEFAULT_EXPLORER_ADDRESS + 'en/token/' + props.tokenId;
    return (
        <div className="d-flex flew-row m-1">
            <div>{props.name}</div>
            &nbsp;
            {
                UNDERLYING_TOKENS.find(t => t.tokenId === props.tokenId) ?
                    <img src={verifiedIcon} width="20" height="20" className="d-inline-block align-top bggreen" alt={URL} />
                    : null
            }
            <a href={URL} target="_blank" rel="noreferrer">
                <img src={openIcon} width="20" height="20" className="d-inline-block align-top" alt={URL} />
            </a>
        </div>
    )
}