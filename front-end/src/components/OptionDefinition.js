import React, { Fragment } from 'react';


export default function OptionDefinition(props) {
    console.log("OptionDefinition", props);
    return (
        <Fragment>
            &nbsp;
            <div className="d-flex flex-column align-items-center">
                {props.optionDef?.strikePrice}
            </div>
        </Fragment>

    )
}
