import React, { Fragment } from 'react';
import ReactTooltip from "react-tooltip";


export default function HelpToolTip(props) {
    return (
        <Fragment>
            <div>
                <img
                    src={props.image}
                    alt={"help tooltip"}
                    width="24px"
                    data-tip
                    data-for={props.id}
                />
                <ReactTooltip id={props.id}
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
                        {props.html}
                    </div>
                </ReactTooltip>
            </div>
        </Fragment>

    )
}
