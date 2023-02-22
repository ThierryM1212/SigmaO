import React from 'react';
import { boxByIdv1, getTokenInfo, getTokensForAddress, getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS } from '../utils/script_constants';
import { SellTokenRequest } from '../objects/SellTokenRequest';
import SellTokenList from '../components/SellTokenList';
import { getAMMPrices } from '../ergo-related/amm';
import { errorAlert } from '../utils/Alerts';
import { Table } from 'react-bootstrap';
import ThemedSelect from '../components/ThemedSelect';
import { formatERGAmount } from '../utils/utils';
import { NANOERG_TO_ERG, TX_FEE } from '../utils/constants';
import { createTokenBuyRequest } from '../actions/BuyRequestActions';
import HelpToolTip from '../components/HelpToolTip';
import helpIcon from '../images/help_outline_blue_48dp.png';
import TokenLink from '../components/TokenLink';
import OptionLink from '../components/OptionLink';
import { OptionDef } from '../objects/OptionDef';


export default class BuyTokensPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sellTokenRequestsList: undefined,
            tokenAmount: 0, //
            tokenId: '',
            tokenPrice: 0,
            oraclePrice: undefined,
            AMMPrices: [],
            walletTokens: [],
            buyTokenRequests: undefined,
            currentToken: undefined,
            currentOptionDef: undefined,
        };

        this.setTokenAmount = this.setTokenAmount.bind(this);
        this.setTokenPrice = this.setTokenPrice.bind(this);
        this.setTokenId = this.setTokenId.bind(this);
        this.fetchSellTokenRequests = this.fetchSellTokenRequests.bind(this);
    };

    setTokenAmount = (s) => { this.setState({ tokenAmount: s.replace(/[^0-9.]/g, "") }); };
    setTokenPrice = (s) => { this.setState({ tokenPrice: s.replace(/[^0-9]/g, "") }); };
    setTokenId = (s) => { this.setState({ tokenId: s }, () => this.setCurrentToken(s)); };

    async setCurrentToken(tokenId) {
        var currentToken = this.state.walletTokens.find(o => o.tokenId === tokenId);
        if (!currentToken) {
            currentToken = await getTokenInfo(tokenId);
            currentToken['amount'] = 0;
        };
        const issuerBox = await boxByIdv1(tokenId);
        var currentOptionDef = undefined;
        if (issuerBox.address === OPTION_SCRIPT_ADDRESS) {
            currentOptionDef = await OptionDef.create(issuerBox);
        } else {
            currentOptionDef = undefined;
        }
        this.setState({ currentToken: currentToken, currentOptionDef: currentOptionDef })
    }

    async fetchSellTokenRequests() {
        const sellTokenBoxes = await getUnspentBoxesForAddressUpdated(SELL_FIXED_SCRIPT_ADDRESS);
        console.log(sellTokenBoxes);
        const sellTokenRequests = await Promise.all(
            sellTokenBoxes.map(async (b) => await SellTokenRequest.create(b))
        );
        console.log(sellTokenRequests);
        this.setState({ sellTokenRequestsList: sellTokenRequests });
    }

    async mintBuyToken() {
        if (this.state.currentToken) {
            console.log("mintBuyToken", this.state.tokenId,
                this.state.tokenAmount,
                Math.round(this.state.tokenPrice / Math.pow(10, this.state.currentToken.decimals)
                ));
            const txId = await createTokenBuyRequest(
                this.state.tokenId,
                this.state.tokenAmount,
                Math.round(this.state.tokenPrice / Math.pow(10, this.state.currentToken.decimals))
            );
        } else {
            errorAlert("Current token " + this.state.tokenId + " not found !")
        }
    }

    async componentDidMount() {
        const AMMPrices = await getAMMPrices();
        this.setState({ AMMPrices: AMMPrices });
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const walletTokens = await getTokensForAddress(address);
            //console.log("walletOptionDefs", walletOptionDefs)
            if (walletTokens.length > 0) {
                this.setTokenId(walletTokens[0].tokenId);
            }
            this.setState({ walletTokens: walletTokens })
        } else {
            errorAlert("ERG address not set")
            return;
        }
        this.fetchSellTokenRequests();
    }

    render() {
        const tokensList = this.state.walletTokens.map(u_tok => { return { value: u_tok.tokenId, label: u_tok.name } });
        const currentToken = this.state.currentToken;
        const currentTokenPrice = this.state.AMMPrices.find(t => t.tokenId === this.state.tokenId)?.price ?? 0;
        console.log("currentTokenPrice", currentTokenPrice, this.state.AMMPrices)
        const currentTokenDecimalFactor = Math.pow(10, currentToken?.decimals) ?? 1;
        return (
            <div className="w-100 m-1 p-1">
                <div className="card zonemint p-1 m-2">
                    <h4>Create a open buy token order</h4>
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
                                        <input type="text"
                                            id="underlyingToken"
                                            className="form-control col-sm input-dark"
                                            onChange={e => this.setTokenId(e.target.value)}
                                            value={this.state.tokenId}
                                            autoComplete="off"
                                        />
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <div className='d-flex flex-row align-items-center'>
                                                    <div>(Available {(currentToken.amount / currentTokenDecimalFactor).toFixed(currentToken.decimals)})</div>
                                                    {
                                                        this.state.currentOptionDef ?
                                                            <OptionLink optionDef={this.state.currentOptionDef} />
                                                            :
                                                            <TokenLink tokenId={this.state.tokenId} />
                                                    }
                                                </div>
                                                :
                                                this.state.currentOptionDef ?
                                                    <OptionLink optionDef={this.state.currentOptionDef} />
                                                    :
                                                    <TokenLink tokenId={this.state.tokenId} />
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex flex-row'>
                                            <div>Buy amount</div>
                                            <HelpToolTip image={helpIcon} id='Buy amount help' html={
                                                <div>Number of token to buy. The buy order needs to be completed in one transaction, no partial buy is supported.</div>
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
                                            <HelpToolTip image={helpIcon} id='Buy Price help' html={
                                                <div>NanoERG per token.</div>
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
                                                    {formatERGAmount(Math.round(this.state.tokenPrice / currentTokenDecimalFactor) * currentTokenDecimalFactor)}
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
                                                    <td>{formatERGAmount(TX_FEE)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Total buy price</td>
                                                    <td>
                                                        {
                                                            currentToken ?
                                                                formatERGAmount(this.state.tokenPrice * this.state.tokenAmount)
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
                            onClick={() => this.mintBuyToken()}
                        >
                            Buy Tokens
                        </button>
                    </div>
                </div >
                <h5>Tokens on sale</h5>
                <SellTokenList sellTokenRequestsList={this.state.sellTokenRequestsList} />
            </div>
        )
    }
}
