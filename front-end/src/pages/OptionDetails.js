import React from 'react';
import { getOraclePrice, searchUnspentBoxes, } from '../ergo-related/explorer';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { Option } from '../objects/Option';
import OptionCard from '../components/OptionCard';
import { Table } from 'react-bootstrap';
import { getOptionName } from '../utils/option_utils';
import AddressLink from '../components/AddressLink';
import { formatERGAmount, formatLongString } from '../utils/utils';
import TokenLink from '../components/TokenLink';
import BuyOptionsPage from './BuyOptionsPage';
import { getBalance } from '../ergo-related/wallet';


export default class OptionDetails extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionTokenId: props.tokenId,
            option: undefined,
            underlyingTokenPrice: undefined,
            walletOptionBalance: 0,
        };
    }

    async componentDidMount() {
        var optionReserveBox = await searchUnspentBoxes(OPTION_SCRIPT_ADDRESS, [this.state.optionTokenId]);
        optionReserveBox = optionReserveBox.filter(b=>b.assets[0].tokenId === this.state.optionTokenId);
        if (optionReserveBox?.length > 0) {
            const option = await Option.create(optionReserveBox[0]);
            this.setState({ option: option })
            const underlyingTokenId = option.optionDef.underlyingTokenId;
            const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === underlyingTokenId);
            if (underlyingToken) {
                const underlyingTokenPrice = await getOraclePrice(underlyingToken.oracleNFTID);
                this.setState({ underlyingTokenPrice: underlyingTokenPrice })
            }
            const optionBalance = await getBalance(this.props.tokenId);
            this.setState({ walletOptionBalance: optionBalance });
        }
    }

    render() {
        const optionDef = this.state.option?.optionDef;
        const underlyingTokenInfo = optionDef?.underlyingTokenInfo;
        var optionName = '';
        if (optionDef && underlyingTokenInfo) {
            optionName = getOptionName(optionDef.optionType, optionDef.optionStyle, underlyingTokenInfo.name,
                optionDef.strikePrice, new Date(optionDef.maturityDate), optionDef.shareSize);
        }
        return (
            <div className='w-100 d-flex flex-column'>
                <div className="card zonemint p-1 m-2">
                    {
                        this.state.option ?
                            <div className='w-100 d-flex flex-column align-items-center'>
                                <div>
                                    <OptionCard option={this.state.option}
                                        oraclePrice={this.state.underlyingTokenPrice}
                                        showExercise={this.state.walletOptionBalance > 0} />
                                </div>

                                <Table striped hover>
                                    <tbody>
                                        <tr>
                                            <td>Name</td>
                                            <td>
                                                {optionName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Option token</td><td><TokenLink tokenId={optionDef.optionTokenId} name={formatLongString(optionDef.optionTokenId,8)} /></td>
                                        </tr>
                                        <tr>
                                            <td>Underlying token</td><td><TokenLink tokenId={underlyingTokenInfo.id} name={underlyingTokenInfo.name} /></td>
                                        </tr>
                                        <tr>
                                            <td>Issuer address</td><td><AddressLink address={optionDef.issuerAddress} /></td>
                                        </tr>
                                        <tr>
                                            <td>dApp UI address</td><td><AddressLink address={optionDef.dAppUIAddress} /></td>
                                        </tr>
                                        <tr>
                                            <td>dApp mint fee</td><td>{formatERGAmount(optionDef.dAppUIMintFee)}</td>
                                        </tr>
                                        <tr>
                                            <td>Compound option</td><td>{optionDef.isCompoundOption.toString()}</td>
                                        </tr>
                                        <tr>
                                            <td>Minted</td><td>{this.state.option.isMinted.toString()}</td>
                                        </tr>
                                        <tr>
                                            <td>Delivered to issuer</td><td>{this.state.option.isDelivered.toString()}</td>
                                        </tr>
                                        <tr>
                                            <td>Exercible</td><td>{optionDef.isExercible.toString()}</td>
                                        </tr>
                                        <tr>
                                            <td>Expired</td><td>{optionDef.isExpired.toString()}</td>
                                        </tr>
                                        <tr>
                                            <td>Reserve empty</td><td>{this.state.option.isEmpty.toString()}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                            :
                            <div>Option {this.state.optionTokenId} not found</div>
                    }
                </div>
                {
                    optionDef ?
                        <BuyOptionsPage optionTokenId={optionDef.optionTokenId} underlyingTokenId={underlyingTokenInfo.id} />
                        : null
                }
            </div>
        )
    }
}
