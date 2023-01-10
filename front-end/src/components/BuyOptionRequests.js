import React, { Fragment } from 'react';
import { BUY_OPTION_REQUEST_SCRIPT_ADDRESS } from '../utils/constants';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { BuyOptionRequest } from '../utils/BuyOptionRequest';
import { formatLongString } from '../utils/utils';
import { processBuyRequest, refundBuyRequest } from '../ergo-related/mint';

/* global BigInt */


export default class BuyOptionRequests extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            buyOptionRequestsList: [],
        };
        this.fetchOptionRequests = this.fetchOptionRequests.bind(this);
    }

    async fetchOptionRequests() {
        const buyOptionsRequestsBoxes = await getUnspentBoxesForAddressUpdated(BUY_OPTION_REQUEST_SCRIPT_ADDRESS);
        const buyOptionsRequests = await Promise.all(buyOptionsRequestsBoxes.map(async box => {return await BuyOptionRequest.create(box)}));
        this.setState({ buyOptionRequestsList: buyOptionsRequests })
    }

    async componentDidMount() {
        this.fetchOptionRequests();
    }

    async processBuy(box) {
        await processBuyRequest(box);
    }

    async refundRequest(box) {
        await refundBuyRequest(box);
    }

    render() {
        console.log("render", this)
        return (
            <Fragment >
                <div className="card zonemint p-1 m-1">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Box id</th>
                                <th>Issuer</th>
                                <th>Option token ID</th>
                                <th>Option amount</th>
                                <th>Max Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.buyOptionRequestsList.map(buyRequest => {
                                    return <tr key={buyRequest.full.boxId}>
                                        <td>{formatLongString(buyRequest.full.boxId, 6) }</td>
                                        <td>{formatLongString(buyRequest.buyerAddress, 6)}</td>
                                        <th>{formatLongString(buyRequest.optionTokenID, 6)}</th>
                                        <th>{buyRequest.optionAmount}</th>
                                        <th>{buyRequest.maxTotalPrice}</th>
                                        <td>
                                            <button className='btn btn-blue' onClick={() => this.processBuy(buyRequest.full)}>Process</button>
                                            <button className='btn btn-blue' onClick={() => this.refundRequest(buyRequest.full)}>Refund</button>
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
