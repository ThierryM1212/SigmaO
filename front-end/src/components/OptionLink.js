import ReactTooltip from "react-tooltip";
import openIcon from "../images/open_in_new_white_24dp.svg";
import verifiedIcon from "../images/verified_white_24dp.svg";
import { DEFAULT_EXPLORER_ADDRESS } from "../utils/constants";
import { formatLongString } from "../utils/utils";
import OptionCard from "./OptionCard";


export default function OptionLink(props) {
    const URL = DEFAULT_EXPLORER_ADDRESS + 'en/token/' + props.optionDef.optionTokenId;
    return (
        <div className="w-100 d-flex flew-row m-1 align-items-center">
            <ReactTooltip id={props.optionDef.optionTokenId}
                place="right"
                effect="solid"
                data-html={true}
                delayShow={300}
                delayHide={300}
                insecure={true}
                multiline={true}
                backgroundColor="black"
            >
                <div className="d-flex flex-column align-items-start">
                    <OptionCard option={props.optionDef} />
                </div>
            </ReactTooltip>
            <a href={"/option-details/" + props.optionDef.optionTokenId}
                target="_blank" rel="noreferrer"
                data-tip
                data-for={props.optionDef.optionTokenId} >
                {formatLongString(props.optionDef.optionName, 30) }
            </a>
            &nbsp;

            <img src={verifiedIcon} width="20" height="20" className="d-inline-block align-top bggreen" alt={URL} />
            <a href={URL} target="_blank" rel="noreferrer">
                <img src={openIcon} width="20" height="20" className="d-inline-block align-top" alt={URL} />
            </a>
        </div>
    )
}