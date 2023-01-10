import React, { Fragment } from 'react';
import { MIN_NANOERG_BOX_VALUE, OPTION_TYPES, UNDERLYING_TOKENS } from '../utils/constants';
import Table from 'react-bootstrap/Table';
import JSONBigInt from 'json-bigint';

import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { OptionDef } from '../utils/OptionDef';
import { buyOptionRequest, exerciseOptionRequest } from '../ergo-related/mint';
import { promptOptionAmount } from '../utils/Alerts';
import { formatERGAmount, formatLongString, maxBigInt } from '../utils/utils';
import { OptionPriceTimeChart } from './OptionPriceTimeChart';
let ergolib = import('ergo-lib-wasm-browser');

/* global BigInt */

export default class Options extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionList: [],
        };
        this.fetchOptions = this.fetchOptions.bind(this);
    }

    async fetchOptions() {
        var allOptions = [];
        for (const token of UNDERLYING_TOKENS) {
            const options = (await getUnspentBoxesForAddressUpdated(token.optionScriptAddress))
                .filter(box => box.assets.length == 2);
            allOptions = allOptions.concat(options);
        }

        allOptions = await Promise.all(allOptions.map(async opt => {
            var res = { ...opt }
            const boxWASM = (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(opt));
            const creationBox = JSONBigInt.parse(boxWASM.register_value(7).to_ergo_box().to_json())
            //const creationBox2 = await boxByIdv1(creationBox.boxId)
            const creationBox2 = await OptionDef.create(creationBox)
            console.log("creationBox2", creationBox2)
            res["creationBox"] = creationBox2;
            return res;
        }))
        console.log("allOptions", allOptions)
        this.setState({ optionList: allOptions })
    }

    async buyOption(optionTokenID, maxPrice) {
        const amount = await promptOptionAmount("Option amount to buy");
        await buyOptionRequest(optionTokenID, amount, maxPrice);
    }

    async exerciseOption(optionTokenID) {
        const amount = await promptOptionAmount("Option amount to exercise");
        await exerciseOptionRequest(optionTokenID, amount);
    }

    async componentDidMount() {
        this.fetchOptions();
    }

    render() {
        return (
            <Fragment >
                <div className="card zonemint p-2 m-2">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Options</th>
                                <th>Reserve</th>
                                <th>Issuer address</th>
                                <th>Share size</th>
                                <th>Strike price</th>
                                <th>Maturity date</th>
                                <th>Sigma</th>
                                <th>K1</th>
                                <th>K2</th>
                                <th>UI buy Fee</th>
                                <th>Option price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.optionList.map(box => {
                                    const creationBox = box.creationBox;
                                    const optionToken = UNDERLYING_TOKENS.find(tok => tok.optionScriptAddress === creationBox.address)
                                    const optionPrice = creationBox.currentOptionPrice;
                                    const dAppFee = (BigInt(creationBox.currentOptionPrice) * BigInt(creationBox.dAppUIFee)) / BigInt(1000);
                                    const totalOptionPrice = (BigInt(creationBox.currentOptionPrice) + dAppFee).toString();

                                    return <tr key={creationBox.full.boxId}>
                                        <td>{OPTION_TYPES.find(opt => opt.id === creationBox.optionType).label}</td>
                                        <th>{box.assets[1].amount - 1} / {(creationBox.full.assets[0].amount - 1) / (creationBox.shareSize * Math.pow(10, optionToken.decimals))}</th>
                                        <th>{(box.assets[0].amount - 1) / Math.pow(10, optionToken.decimals)}{" " + optionToken.label}</th>
                                        <td>{formatLongString(creationBox.issuerAddress, 6)}</td>
                                        <td>{creationBox.shareSize}</td>
                                        <td>{creationBox.strikePrice}</td>
                                        <td>{new Date(creationBox.maturityDate).toISOString().slice(0,16).replace('T',' ')}</td>
                                        <td>{creationBox.sigma / 10} %</td>
                                        <td>{creationBox.K1 / 10} %</td>
                                        <td>{creationBox.K2 / 10} %</td>
                                        <td>{creationBox.dAppUIFee / 10} %</td>
                                        <td>

                                            <strong>{formatERGAmount(totalOptionPrice)} ERG</strong>
                                            <div><OptionPriceTimeChart
                                                optionType={OPTION_TYPES.find(opt => opt.id === creationBox.optionType).label}
                                                maturityDate={creationBox.maturityDate}
                                                oraclePrice={creationBox.currentOraclePrice}
                                                strikePrice={creationBox.strikePrice}
                                                shareSize={creationBox.shareSize}
                                                sigma={creationBox.sigma}
                                                K1={creationBox.K1}
                                                K2={creationBox.K2}
                                            /></div>

                                        </td>
                                        <td>
                                            <button className='btn btn-blue' onClick={() => this.buyOption(creationBox.full.boxId, totalOptionPrice)}>Buy</button>
                                            <button className='btn btn-blue' onClick={() => this.exerciseOption(creationBox.full.boxId)}>Exercise</button>
                                        </td>
                                    </tr>
                                })
                            }

                        </tbody>
                    </Table>

                </div >
            </Fragment >
        )
    }
}
