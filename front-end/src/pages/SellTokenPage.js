import React from 'react';
import { NANOERG_TO_ERG, TX_FEE, TX_FEES } from '../utils/constants';
import ThemedSelect from '../components/ThemedSelect';
import "react-datepicker/dist/react-datepicker.css";
import { errorAlert } from '../utils/Alerts';
import { getTokensForAddress, getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { formatERGAmount } from '../utils/utils';
import { Table } from 'react-bootstrap';
import { getAMMPrices } from '../ergo-related/amm';
import { createTokenSellRequest } from '../actions/BuyRequestActions';
import ExternalSales from '../components/ExternalSales';
import { BuyTokenRequest } from '../objects/BuyTokenRequest';
import BuyTokenList from '../components/BuyTokenList';
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS } from '../utils/script_constants';
import HelpToolTip from '../components/HelpToolTip';
import helpIcon from '../images/help_outline_blue_48dp.png';
import { getWalletOptions } from '../utils/option_utils';
import OptionLink from '../components/OptionLink';
import TokenLink from '../components/TokenLink';


export default class SellTokenPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tokenAmount: 0, //
            tokenId: '',
            tokenPrice: 0,
            oraclePrice: undefined,
            walletTokens: [],
            walletOptions: [],
            AMMPrices: [],
            buyTokenRequests: undefined,
            txFee: TX_FEE,
        };

        this.setTokenAmount = this.setTokenAmount.bind(this);
        this.setTokenPrice = this.setTokenPrice.bind(this);
        this.setTokenId = this.setTokenId.bind(this);
        this.setTxFee = this.setTxFee.bind(this);
    }

    setTokenAmount = (s) => { this.setState({ tokenAmount: s.replace(/[^0-9.]/g, "") }); };
    setTokenPrice = (s) => { this.setState({ tokenPrice: s.replace(/[^0-9.]/g, "") }); };
    setTokenId = (s) => { this.setState({ tokenId: s }); };
    setTxFee = (s) => { this.setState({ txFee: s }); };

    async mintSellToken() {
        //console.log("mintSellToken", this.state.tokenId, this.state.tokenAmount, this.state.tokenPrice)
        const txId = await createTokenSellRequest(this.state.tokenId, this.state.tokenAmount,            
            Math.round(this.state.tokenPrice * NANOERG_TO_ERG), this.state.txFee);
        console.log("mintSellToken", txId);
    }

    async fetchBuyTokenRequests() {
        const buyTokenBoxes = await getUnspentBoxesForAddressUpdated(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS);
        const buyTokenRequests = await Promise.all(
            buyTokenBoxes.map(async box => { return await BuyTokenRequest.create(box) })
        );
        //console.log("fetchBuyTokenRequests", buyTokenRequests);
        this.setState({ buyTokenRequests: buyTokenRequests })
    }

    async componentDidMount() {
        const AMMPrices = await getAMMPrices();
        this.setState({ AMMPrices: AMMPrices });
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const walletTokens = await getTokensForAddress(address);
            if (walletTokens.length > 0) {
                this.setTokenId(walletTokens[0].tokenId);
            }
            var walletOptions = await getWalletOptions(address);

            this.setState({ walletOptions: walletOptions, walletTokens: walletTokens })
        } else {
            errorAlert("ERG address not set")
            return;
        }
        this.fetchBuyTokenRequests();
    }

    render() {
        const tokensList = this.state.walletTokens.map(u_tok => { return { value: u_tok.tokenId, label: u_tok.name } });
        const currentToken = this.state.walletTokens.find(o => o.tokenId === this.state.tokenId);
        const currentTokenPrice = this.state.AMMPrices.find(t => t.tokenId === this.state.tokenId)?.price ?? 0;
        const currentTokenDecimalFactor = Math.pow(10, currentToken?.decimals) ?? 1;
        const currentOption = this.state.walletOptions.find(o => o.optionDef.optionTokenId === this.state.tokenId);
        const txFees = TX_FEES.map(i => { return { value: i, label: formatERGAmount(i) } });
        return (
            <div className="w-100 m-1 p-1">
                <div className="card zonemint p-1 m-2">
                    <h4>Create a open sell token order</h4>
                    <div className='card zonemint d-flex flex-column m-2 p-2'>
                        <Table>
                            <tbody>
                                <tr>
                                    <td>Token</td>
                                    <td>
                                        <div className='w-100'>
                                            <ThemedSelect id="optionToken"
                                                value={currentToken?.name}
                                                onChange={(tok) => this.setTokenId(tok.value)}
                                                options={tokensList}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <div className='d-flex flex-row align-items-center'>
                                                    <div>(Available {(currentToken.amount / currentTokenDecimalFactor).toFixed(currentToken.decimals)})</div>
                                                    {
                                                        currentOption ?
                                                            <OptionLink optionDef={currentOption.optionDef} />
                                                            :
                                                            <TokenLink tokenId={this.state.tokenId} />
                                                    }
                                                </div>
                                                :
                                                null
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex flex-row'>
                                            <div>Sell amount</div>
                                            <HelpToolTip image={helpIcon} id='Sell amount help' html={
                                                <div>Number of token to sell</div>
                                            } />
                                        </div>
                                    </td>
                                    <td>
                                        <input type="text"
                                            id="tokenAmount"
                                            className="form-control col-sm input-dark"
                                            onChange={e => this.setTokenAmount(e.target.value)}
                                            value={this.state.tokenAmount}
                                            autoComplete="off"
                                        />
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <small>
                                                    (Available {(currentToken.amount / currentTokenDecimalFactor).toFixed(currentToken.decimals)})
                                                </small>
                                                : null
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex flex-row'>
                                            <div>Price</div>
                                            <HelpToolTip image={helpIcon} id='strike price help' html={
                                                <div>Token price in ERG</div>
                                            } />
                                        </div>
                                    </td>
                                    <td>
                                        <div className='w-100'>
                                            <input type="text"
                                                id="price"
                                                className="form-control col-sm input-dark"
                                                onChange={e => this.setTokenPrice(e.target.value)}
                                                value={this.state.tokenPrice}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <div>
                                                    {formatERGAmount(Math.round(this.state.tokenPrice * NANOERG_TO_ERG / currentTokenDecimalFactor) * currentTokenDecimalFactor)}
                                                    &nbsp;per {currentToken.name}
                                                </div>
                                                :
                                                null
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>Oracle price</td>
                                    <td>
                                        {
                                            currentTokenPrice && currentToken ?
                                                <div>
                                                    {formatERGAmount(Math.round(NANOERG_TO_ERG / parseFloat(currentTokenPrice)))}
                                                    &nbsp;per {currentToken.name}
                                                </div>
                                                :
                                                <div>-</div>
                                        }
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Miner fee</td>
                                    <td>
                                        <div className='w-100'>
                                            <ThemedSelect id="txFee"
                                                value={txFees.find(i => i.value === this.state.txFee).label}
                                                onChange={(i) => this.setTxFee(i.value)}
                                                options={txFees}
                                            />
                                        </div>
                                    </td>
                                    <td><small>Transaction miner fee</small></td>
                                </tr>

                            </tbody>
                        </Table>

                        {
                            currentToken ?
                                <div className='w-100 d-flex flex-column align-items-center'>
                                    <div className='w-75 gold-border m-2 p-2'>
                                        <Table>
                                            <tbody>
                                                <tr>
                                                    <td>Cost</td>
                                                    <td>{formatERGAmount(2 * this.state.txFee)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Total sell price</td>
                                                    <td>
                                                        {
                                                            currentToken ?
                                                                formatERGAmount(this.state.tokenPrice * this.state.tokenAmount * NANOERG_TO_ERG)
                                                                : null
                                                        }
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                                : null
                        }
                    </div>
                    <div className='d-flex flex-row justify-content-center align-items-center'>
                        <button className='btn btn-blue'
                            onClick={() => this.mintSellToken()}
                        >
                            Sell Tokens
                        </button>
                    </div>
                </div >
                <div>
                    <BuyTokenList buyTokenRequestsList={this.state.buyTokenRequests} showTitle={true} />
                </div>
                <ExternalSales />
            </div >
        )
    }
}
