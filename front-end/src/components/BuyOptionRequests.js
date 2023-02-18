import React, { Fragment } from 'react';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { BuyTokenRequest } from '../objects/BuyTokenRequest';
import { formatLongString } from '../utils/utils';
import { refundBuyRequest } from '../actions/BuyRequestActions';
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS } from '../utils/script_constants';
import { displayTransaction } from '../utils/Alerts';
import { processBuyRequest } from '../actions/botOptionAction';

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
        const buyOptionsRequestsBoxes = await getUnspentBoxesForAddressUpdated(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS);
        const buyOptionsRequests = await Promise.all(buyOptionsRequestsBoxes.map(async box => {return await BuyTokenRequest.create(box)}));
        this.setState({ buyOptionRequestsList: buyOptionsRequests })
    }

    async componentDidMount() {
        this.fetchOptionRequests();
    }

    async processBuy(buyRequest) {
        const txId = await processBuyRequest(buyRequest);
        displayTransaction(txId);
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
                                        <th>{formatLongString(buyRequest.optionTokenId, 6)}</th>
                                        <th>{buyRequest.optionAmount}</th>
                                        <th>{buyRequest.buyRequestValue}</th>
                                        <td>
                                            <button className='btn btn-yellow' onClick={() => this.processBuy(buyRequest)}>Process</button>
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
