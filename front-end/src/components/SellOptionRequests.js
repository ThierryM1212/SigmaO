import React, { Fragment } from 'react';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { formatERGAmount, formatLongString } from '../utils/utils';
import { UNDERLYING_TOKENS } from '../utils/script_constants';
import { SellOptionRequest } from '../objects/SellOptionRequest';
import { createBuyOptionRequest, refundSellOption } from '../actions/BuyRequestActions';
import { promptOptionAmount } from '../utils/Alerts';
import { closeSellOption } from '../actions/botOptionAction';


export default class SellOptionRequests extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sellOptionRequestsList: [],
        };
        this.fetchSellOptionRequests = this.fetchSellOptionRequests.bind(this);
    }

    async fetchSellOptionRequests() {
        const sellScriptAddresses = UNDERLYING_TOKENS.map(t => t.sellOptionScriptAddress)
        const sellOptionsRequestsBoxes = (await Promise.all(sellScriptAddresses.map(async addr => getUnspentBoxesForAddressUpdated(addr)))).flat();
        const sellOptionsRequests = await Promise.all(sellOptionsRequestsBoxes.map(async box => { return await SellOptionRequest.create(box) }));
        this.setState({ sellOptionRequestsList: sellOptionsRequests })
    }

    async componentDidMount() {
        this.fetchSellOptionRequests();
    }

    async buyOption(sellRequest) {
        //console.log("buyOption")
        const optionAmount = await promptOptionAmount("Amount of option to buy");
        await createBuyOptionRequest(sellRequest,
            optionAmount,
            Math.floor(parseInt(sellRequest.optionCurrentPrice) * 1.01)); // 1% slippage TO DO configure
    }

    async refund(box) {
        //console.log("refund", box)
        await refundSellOption(box);
    }

    async closeEmptySellOption(sellRequest) {
        //console.log("closeEmptySellOption", box)
        await closeSellOption(sellRequest);
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
                                <th>Seller</th>
                                <th>Option token ID</th>
                                <th>Option amount</th>
                                <th>Option price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.sellOptionRequestsList.map(sellRequest => {
                                    return <tr key={sellRequest.full.boxId}>
                                        <td>{formatLongString(sellRequest.full.boxId, 6)}</td>
                                        <td>{formatLongString(sellRequest.sellerAddress, 6)}</td>
                                        <th>{formatLongString(sellRequest.option.optionDef.optionTokenId, 6)}</th>
                                        <th>{sellRequest.optionAmount / Math.pow(10, sellRequest.option.optionDef.underlyingTokenInfo.decimals)}</th>
                                        <th>{formatERGAmount(sellRequest.optionCurrentPrice)} ERG</th>
                                        <td>
                                            <button className='btn btn-blue' onClick={() => this.buyOption(sellRequest)}>Buy</button>
                                            <button className='btn btn-blue' onClick={() => this.refund(sellRequest.full)}>Refund</button>
                                            <button className='btn btn-yellow' onClick={() => this.closeEmptySellOption(sellRequest)}>Close</button>
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
