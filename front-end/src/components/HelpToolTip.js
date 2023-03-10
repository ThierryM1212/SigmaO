import React, { Fragment } from 'react';
import ReactTooltip from "react-tooltip";


export default function HelpToolTip(props) {
    var width = 24;
    if(props.width) {
        width = props.width;
    }
    return (
        <Fragment>
            <div>
                <img
                    src={props.image}
                    alt={"help tooltip"}
                    width={width}
                    data-tip
                    data-for={props.id}
                />
                <ReactTooltip id={props.id}
                    place="down"
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
