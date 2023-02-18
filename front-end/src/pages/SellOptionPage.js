import React, { Fragment } from 'react';
import { MIN_NANOERG_BOX_VALUE, NANOERG_TO_ERG } from '../utils/constants';
import ThemedSelect from '../components/ThemedSelect';
import "react-datepicker/dist/react-datepicker.css";
import { errorAlert } from '../utils/Alerts';
import { createSellOption } from '../actions/BuyRequestActions';
import { getOraclePrice, getTokensForAddress } from '../ergo-related/explorer';
import { formatERGAmount, getOptionPrice } from '../utils/utils';
import { getWalletOptions } from '../utils/option_utils';
import { Table } from 'react-bootstrap';
import { UNDERLYING_TOKENS } from '../utils/script_constants';
import expandLessIcon from '../images/expand_less_white_24dp.svg';
import expandMoreIcon from '../images/expand_more_white_24dp.svg';
import { getAMMPrices } from '../ergo-related/amm';
import PriceCharts from '../components/PriceCharts';
import ExternalSales from '../components/ExternalSales';


export default class SellOptionPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sigma: 500,
            K1: 700,
            K2: 100,
            freezeDelayHour: 4, // hour
            optionAmount: 1, //
            optionToken: undefined,
            walletTokens: [],
            walletOptions: [],
            AMMPrices: [],
            showPriceSimulation: false,
            pricingDate: new Date(),
            oraclePrice: undefined,
            oraclePriceGraph: undefined,
        };

        this.setSigma = this.setSigma.bind(this);
        this.setK1 = this.setK1.bind(this);
        this.setK2 = this.setK2.bind(this);
        this.setOptionAmount = this.setOptionAmount.bind(this);
        this.setFreezeDelay = this.setFreezeDelay.bind(this);
        this.setOptionToken = this.setOptionToken.bind(this);
        this.setPricingDate = this.setPricingDate.bind(this);
        this.togglePriceSimulation = this.togglePriceSimulation.bind(this);
    }

    setSigma = (s) => { this.setState({ sigma: s.replace(/[^0-9]/g, "") }); };
    setK1 = (s) => { this.setState({ K1: s.replace(/[^0-9]/g, "") }); };
    setFreezeDelay = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };
    setK2 = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };
    setOptionAmount = (s) => { this.setState({ optionAmount: s.replace(/[^0-9]/g, "") }); };
    setOraclePriceGraph = (oraclePrice) => { this.setState({ oraclePriceGraph: oraclePrice.replace(/[^0-9]/g, "") }); };
    setPricingDate = (date) => { this.setState({ pricingDate: date }); };
    setOptionToken = async (s) => {
        console.log("setOptionToken", s)
        var oraclePrice = this.state.AMMPrices.find(t => t.tokenId === s.optionDef.underlyingTokenId)?.price;
        if (oraclePrice) {
            oraclePrice = Math.round(NANOERG_TO_ERG / oraclePrice);
        } else {
            const oracleNFTId = UNDERLYING_TOKENS.find(t => t.tokenId === s.optionDef.underlyingTokenId)?.oracleNFTID;
            if (oracleNFTId) {
                oraclePrice = await getOraclePrice(oracleNFTId);
            } else {
                oraclePrice = 0;
            }
        }
        console.log("oraclePrice", oraclePrice);
        this.setState({
            optionToken: s,
            oraclePrice: oraclePrice,
            oraclePriceGraph: oraclePrice,
        });
    };
    togglePriceSimulation = (s) => { this.setState({ showPriceSimulation: !s }); }

    async mintSellOption() {
        try {
            await createSellOption(this.state.optionToken.optionDef.optionTokenId, this.state.optionAmount, this.state.sigma, this.state.K1, this.state.K2, this.state.freezeDelayHour);
        } catch (e) {
            console.log(e);
            errorAlert(e.toString())
        }
    }

    async componentDidMount() {
        console.log("componentDidMount");
        const AMMPrices = await getAMMPrices();
        console.log("AMMPrices", AMMPrices);
        this.setState({ AMMPrices: AMMPrices });
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const walletTokens = await getTokensForAddress(address);
            var walletOptions = await getWalletOptions(address);
            walletOptions = walletOptions.filter(o => UNDERLYING_TOKENS.find(t => o.optionDef.underlyingTokenId === t.tokenId))
                .filter(o => !o.optionDef.isExpired)
            //console.log("walletOptionDefs", walletOptionDefs)
            if (walletOptions.length > 0) {
                this.setOptionToken(walletOptions[0]);
            }
            this.setState({ walletOptions: walletOptions, walletTokens: walletTokens })

        } else {
            errorAlert("ERG address not set")
            return;
        }

    }

    render() {
        const optionTokens = this.state.walletOptions.map(u_tok => { return { value: u_tok.optionDef.optionTokenId, label: u_tok.optionDef.optionName } });
        const currentOption = this.state.walletOptions.find(o => o?.optionDef.optionTokenId === this.state.optionToken?.optionDef.optionTokenId);
        const currentToken = this.state.walletTokens.find(o => o.tokenId === currentOption?.optionDef.optionTokenId);
        const mintFee = 2 * currentOption?.optionDef.txFee + MIN_NANOERG_BOX_VALUE;
        console.log("render SellOption", this.state, optionTokens, currentOption)
        return (
            <Fragment >
                <div className="card zonemint p-1 m-2">
                    <h4>Sell options with SigmaO priced sell contract</h4>
                    <div className='card zonemint d-flex flex-column m-2 p-2'>
                        <Table>
                            <tbody>
                                <tr>
                                    <td>Option token</td>
                                    <td>
                                        <div className='w-100'>
                                            <ThemedSelect id="optionToken"
                                                value={currentOption?.optionDef.optionName}
                                                onChange={(tok) => this.setOptionToken(this.state.walletOptions.find(o => o?.optionDef.optionTokenId === tok.value))}
                                                options={optionTokens}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <div>(Available {(currentToken.amount / Math.pow(10, currentToken.decimals)).toFixed(currentToken.decimals)})</div>
                                                :
                                                null
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>Option amount</td>
                                    <td>
                                        <input type="text"
                                            id="optionAmount"
                                            className="form-control col-sm input-dark"
                                            onChange={e => this.setOptionAmount(e.target.value)}
                                            value={this.state.optionAmount}
                                            autoComplete="off"
                                        />
                                    </td>
                                    <td><small>Number of option(s) to sell</small></td>
                                </tr>
                                <tr>
                                    <td>Sigma (‰)</td>
                                    <td>
                                        <div className='w-100'>
                                            <input type="text"
                                                id="sigma"
                                                className="form-control col-sm input-dark"
                                                onChange={e => this.setSigma(e.target.value)}
                                                value={this.state.sigma}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </td>
                                    <td><small>Volatility of the asset per thousand. Bigger increase the option price with remaining duration.</small></td>
                                </tr>
                                <tr>
                                    <td>K1 (‰)</td>
                                    <td>
                                        <div className='w-100'>
                                            <input type="text"
                                                id="K1"
                                                className="form-control col-sm input-dark"
                                                onChange={e => this.setK1(e.target.value)}
                                                value={this.state.K1}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </td>
                                    <td><small>Spread factor. Bigger decrease the option price with the price spread (ABS(strike price - oracle price))</small></td>
                                </tr>
                                <tr>
                                    <td>K2 (‰)</td>
                                    <td>
                                        <div className='w-100'>
                                            <input type="text"
                                                id="K2"
                                                className="form-control col-sm input-dark"
                                                onChange={e => this.setK2(e.target.value)}
                                                value={this.state.K2}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </td>
                                    <td><small>American factor. Bigger increase the price of the American option compared to the European option.</small></td>
                                </tr>
                                <tr>
                                    <td>Freeze delay (h)</td>
                                    <td>
                                        <div className='w-100'>
                                            <input type="text"
                                                id="freezeDelay"
                                                className="form-control col-sm input-dark"
                                                onChange={e => this.setFreezeDelay(e.target.value)}
                                                value={this.state.freezeDelayHour}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </td>
                                    <td><small>Time in hour before the maturity date at which the sell will be frozen.</small></td>
                                </tr>
                            </tbody>
                        </Table>

                        {
                            currentOption ?
                                <div className='w-100 d-flex flex-column align-items-center'>
                                    <div className='w-75 gold-border m-2 p-2'>
                                        <Table>
                                            <tbody>
                                                <tr>
                                                    <td>Cost</td>
                                                    <td>{formatERGAmount(mintFee)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Option current price</td>
                                                    <td>{
                                                        currentOption && this.state.oraclePrice ?
                                                            <div>{
                                                                formatERGAmount(getOptionPrice(currentOption.optionDef.optionType, currentOption.optionDef.optionStyle, new Date(),
                                                                    new Date(currentOption.optionDef.maturityDate),
                                                                    this.state.oraclePrice, currentOption.optionDef.strikePrice, currentOption.optionDef.shareSize,
                                                                    this.state.sigma, this.state.K1, this.state.K2))
                                                            }</div>
                                                            : null

                                                    }</td>
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
                            onClick={() => this.mintSellOption()}
                        >
                            Sell Options
                        </button>
                    </div>


                </div >
                <div className="card zonemint p-1 m-2">
                    {
                        currentOption && this.state.showPriceSimulation && this.state.oraclePrice ?
                            <div>
                                <div className='d-flex flex-row justify-content-between'>
                                    <button className='btn' onClick={() => this.togglePriceSimulation(this.state.showPriceSimulation)}>
                                        <img src={expandLessIcon} alt="Hide price simulation" />
                                    </button>
                                    <h5>Option price simulation</h5>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                                </div>
                                <PriceCharts
                                    optionType={currentOption.optionDef.optionType}
                                    optionStyle={currentOption.optionDef.optionStyle}
                                    maturityDate={new Date(currentOption.optionDef.maturityDate)}
                                    oraclePrice={this.state.oraclePriceGraph}
                                    strikePrice={currentOption.optionDef.strikePrice * Math.pow(10, currentOption.optionDef.underlyingTokenInfo.decimals)}
                                    shareSize={currentOption.optionDef.shareSize}
                                    sigma={this.state.sigma}
                                    K1={this.state.K1}
                                    K2={this.state.K2}
                                />
                            </div>
                            :
                            <div className='d-flex flex-row justify-content-start align-items-end'>
                                <button className='btn'
                                    onClick={() => this.togglePriceSimulation(this.state.showPriceSimulation)}
                                    disabled={!this.state.oraclePrice}
                                >
                                    <img src={expandMoreIcon} alt="Show price simulation" />
                                </button>
                                <h6>Show option price simulation</h6>
                            </div>
                    }
                </div >
                <div className='d-flex flex-column m-2 p-2 zonemint'>

                    <a href="/sell-tokens" target="_self" >
                        <div className="d-flex flex-row justify-content-between align-items-center">
                            <h5>Sell at fixed price</h5>
                        </div>
                    </a>
                </div>
                <ExternalSales />
            </Fragment >
        )
    }
}
