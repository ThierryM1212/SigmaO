import React, { Fragment } from 'react';
import { MIN_NANOERG_BOX_VALUE, OPTION_STYLES, OPTION_TYPES } from '../utils/constants';
import Table from 'react-bootstrap/Table';
import { getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { displayTransaction, promptOptionAmount } from '../utils/Alerts';
import { formatERGAmount, formatLongString } from '../utils/utils';
import { OPTION_SCRIPT_ADDRESS } from '../utils/script_constants';
import { Option } from '../objects/Option';
import { closeOptionExpired, deliverOption, mintOption } from '../actions/botOptionAction';
import { exerciseOptionRequest, refundOptionRequest } from '../actions/userOptionActions';


export default class Options extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionList: [],
        };
        this.fetchOptions = this.fetchOptions.bind(this);
    }

    async fetchOptions() {
        var allOptionJSON = await getUnspentBoxesForAddressUpdated(OPTION_SCRIPT_ADDRESS);
        const allOptions2 = await Promise.all(allOptionJSON.map(async opt => {
            const optionDef = await Option.create(opt);
            return optionDef;
        }))
        //console.log("allOptions", allOptionJSON, allOptions2)
        this.setState({ optionList: allOptions2 })
    }

    async exerciseOption(optionTokenId) {
        const amount = await promptOptionAmount("Option amount to exercise");
        await exerciseOptionRequest(optionTokenId, amount);
    }

    async closeOption(box, issuerAddress) {
        const txId = await closeOptionExpired(box, issuerAddress);
        displayTransaction(txId);
    }

    async deliverOption(box) {
        const txId = await deliverOption(box);
        displayTransaction(txId);
    }

    async mintOption(requestBox) {
        const txId = await mintOption(requestBox);
        displayTransaction(txId);
    }

    async refundRequest(requestBox) {
        await refundOptionRequest(requestBox);
    }

    async componentDidMount() {
        console.log("componentDidMount", this.state)
        this.fetchOptions();
    }

    render() {
        console.log("render", this.state)
        return (
            <Fragment >
                <div className="card zonemint p-2 m-2">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Style</th>
                                <th>Asset</th>
                                <th>Reserve</th>
                                <th>Issuer address</th>
                                <th>Share size</th>
                                <th>Strike price</th>
                                <th>Maturity date</th>
                                <th>UI mint Fee</th>
                                <th>Tx Fee</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.state.optionList.map(opt => {
                                    //console.log("opt", opt)
                                    const creationBox = opt.optionDef;
                                    const isClosable = opt.isEmpty || (!creationBox.isExercible && creationBox.isExpired)
                                    console.log("opt", opt);
                                    if (!creationBox) {
                                        return <div></div>;
                                    }
                                    return <tr key={creationBox.full.boxId}>
                                        <td>{OPTION_TYPES.find(opt => opt.id === creationBox.optionType).label}</td>
                                        <td>{OPTION_STYLES.find(opt => opt.id === creationBox.optionStyle).label}</td>
                                        <td>{creationBox.underlyingTokenInfo.name ?? ''}</td>
                                        {
                                            creationBox.optionType === 0 ?
                                                <Fragment>
                                                    <th>
                                                        {(opt.full.assets[1]?.amount ?? 0) / Math.pow(10, creationBox.underlyingTokenInfo.decimals ?? 0)}
                                                        {" " + creationBox.underlyingTokenInfo.name}
                                                    </th>
                                                </Fragment>
                                                :
                                                <Fragment>
                                                    <th>{formatERGAmount(opt.full.value - creationBox.txFee - MIN_NANOERG_BOX_VALUE)} ERG</th>
                                                </Fragment>
                                        }
                                        <td>{formatLongString(creationBox.issuerAddress, 6)}</td>
                                        <td>{creationBox.shareSize}</td>
                                        <td>{creationBox.strikePrice}</td>
                                        <td>{new Date(creationBox.maturityDate).toISOString().slice(0, 16).replace('T', ' ')}</td>

                                        <td>{formatERGAmount(creationBox.dAppUIMintFee)} ERG</td>
                                        <td>{formatERGAmount(creationBox.txFee)} ERG</td>
                                        <td>
                                            <button className='btn btn-blue'
                                                onClick={() => this.exerciseOption(creationBox.full.boxId)}
                                                disabled={!creationBox.isExercible}>
                                                Exercise
                                            </button>
                                            <button className='btn btn-yellow'
                                                onClick={() => this.closeOption(opt.full, creationBox.issuerAddress)}
                                                disabled={!isClosable}>
                                                Close
                                            </button>
                                            <button className='btn btn-yellow'
                                                onClick={() => this.deliverOption(opt.full)}
                                                disabled={opt.isDelivered || !opt.isMinted}  >
                                                Deliver
                                            </button>
                                            <button className='btn btn-yellow'
                                                onClick={() => this.mintOption(opt.full)}
                                                disabled={opt.isMinted}  >
                                                Mint
                                            </button>
                                            <button className='btn btn-yellow'
                                                onClick={() => this.refundRequest(opt.full)}
                                                disabled={opt.isMinted}  >
                                                Refund
                                            </button>
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
