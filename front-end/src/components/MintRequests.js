import React, { Fragment } from 'react';
import { OPTION_STYLES, UNDERLYING_TOKENS } from '../utils/constants';
import Table from 'react-bootstrap/Table';
import JSONBigInt from 'json-bigint';

import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { mintOption, refundOptionRequest } from '../ergo-related/mint';


export default class MintRequests extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mintRequests: [],
        };
        this.fetchOptionRequests = this.fetchOptionRequests.bind(this);
    }

    async fetchOptionRequests() {
        var allOptionRequests = [];
        for (const token of UNDERLYING_TOKENS) {
            const optionMintRequests = (await getUnspentBoxesForAddressUpdated(token.optionScriptAddress))
                .filter(box => box.assets.length === 1);
            allOptionRequests = allOptionRequests.concat(optionMintRequests);
        }
        console.log("allOptionRequests", allOptionRequests)
        this.setState({ mintRequests: allOptionRequests })
    }

    async componentDidMount() {
        this.fetchOptionRequests();
    }

    async mintOption (requestBox) {
        await mintOption(requestBox);
    }

    async refundRequest (requestBox) {
        await refundOptionRequest(requestBox);
    }

    render() {
        return (
            <Fragment >
                <div className="card zonemint p-1 m-1">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Style</th>
                                <th>Token</th>
                                <th>Amount</th>
                                <th>Share size</th>
                                <th>Strike price</th>
                                <th>Maturity date</th>
                                <th>Sigma</th>
                                <th>K1</th>
                                <th>K2</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.mintRequests.map(box => {
                                    const optionParams = JSONBigInt.parse(box.additionalRegisters.R8.renderedValue);
                                    const optionToken = UNDERLYING_TOKENS.find(tok => tok.optionScriptAddress === box.address)

                                    return <tr key={box.boxId}>
                                        <td>{OPTION_STYLES.find(opt => opt.id === optionParams[0]).label}</td>
                                        <td>{optionToken.label}</td>
                                        <td>{(box.assets[0].amount - 1) / ( optionParams[1] * Math.pow(10, optionToken.decimals)) }</td>
                                        <td>{optionParams[1]}</td>
                                        <td>{optionParams[6]}</td>
                                        <td>{new Date(optionParams[2]).toISOString().substring(0,10)}</td>
                                        <td>{optionParams[3] / 10} %</td>
                                        <td>{optionParams[4] / 10} %</td>
                                        <td>{optionParams[5] / 10} %</td>
                                        <td>
                                            <button className='btn btn-blue' onClick={() => this.mintOption(box)}>Mint</button>
                                            <button className='btn btn-blue' onClick={() => this.refundRequest(box)}>Refund</button>
                                        </td>
                                    </tr>
                                }

                                )
                            }

                        </tbody>
                    </Table>

                </div >
            </Fragment >
        )
    }
}
