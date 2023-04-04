import React, { Fragment } from 'react';
import { DAPP_UI_FEE, DAPP_UI_MINT_FEE, DEFAULT_OPTION_DURATION, MAX_UI_OPTION_DURATION, MIN_NANOERG_BOX_VALUE, NANOERG_TO_ERG, OPTION_STYLES, OPTION_TYPES, TX_FEE, TX_FEES } from '../utils/constants';
import ThemedSelect from '../components/ThemedSelect';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { errorAlert } from '../utils/Alerts';
import { createOptionRequest } from "../actions/userOptionActions";
import { boxByIdv1, getBalanceForAddress, getOraclePrice, getTokenInfo } from '../ergo-related/explorer';
import { formatERGAmount } from '../utils/utils';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { Table } from 'react-bootstrap';
import expandLessIcon from '../images/expand_less_white_24dp.svg';
import expandMoreIcon from '../images/expand_more_white_24dp.svg';
import helpIcon from '../images/help_outline_blue_48dp.png';
import PriceCharts from '../components/PriceCharts';
import TokenLink from '../components/TokenLink';
import HelpToolTip from '../components/HelpToolTip';
import { OptionDef } from '../objects/OptionDef';
import OptionLink from '../components/OptionLink';


const optionsTypes = OPTION_TYPES.map(opt_type => { return { value: opt_type.label, label: opt_type.label } });
const optionsStyles = OPTION_STYLES.map(opt_style => { return { value: opt_style.label, label: opt_style.label } });
const now = new Date(new Date().toDateString());
var initMaturityDate = new Date(new Date().toDateString());

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

//initMaturityDate.setTime(0);
initMaturityDate.setDate(initMaturityDate.getDate() + DEFAULT_OPTION_DURATION);

export default class MintOptionPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionType: optionsTypes[0].label,
            optionStyle: optionsStyles[1].label,
            underlyingTokenId: '',
            underlyingTokenInfo: undefined,
            underlyingOptionDef: undefined,
            optionAmount: 10,
            shareSize: 1, // token per option, to be multiplied by decimal factor in contract
            strikePrice: 0.001, // nanoerg per token, to be adjusted by decimal factor in contract
            maturityDate: initMaturityDate,
            txFee: TX_FEE,
            pricingDate: new Date(),
            sigma: 500,
            K1: 700,
            K2: 100,
            oraclePrice: undefined,
            walletTokens: [],
            showPriceSimulation: false,
        };

        this.setOptionType = this.setOptionType.bind(this);
        this.setOptionStyle = this.setOptionStyle.bind(this);
        this.setUnderlyingTokenId = this.setUnderlyingTokenId.bind(this);
        this.setOptionAmount = this.setOptionAmount.bind(this);
        this.setShareSize = this.setShareSize.bind(this);
        this.setStrikePrice = this.setStrikePrice.bind(this);
        this.setMaturityDate = this.setMaturityDate.bind(this);
        this.setPricingDate = this.setPricingDate.bind(this);
        this.setSigma = this.setSigma.bind(this);
        this.setK1 = this.setK1.bind(this);
        this.setK2 = this.setK2.bind(this);
        this.setTxFee = this.setTxFee.bind(this);
        this.togglePriceSimulation = this.togglePriceSimulation.bind(this);
    }

    setOptionType = (type) => { this.setState({ optionType: type, }); };
    setOptionStyle = (style) => { this.setState({ optionStyle: style, }); };
    async setUnderlyingTokenId(tokenId) {
        //console.log("setUnderlyingToken", tokenId, UNDERLYING_TOKENS);
        var filteredTokenId = tokenId.replace(/[^0-9A-Fa-f]/g, "");
        console.log("filteredTokenId", filteredTokenId);
        const underlyingTokenInfo = await getTokenInfo(filteredTokenId);
        console.log("underlyingTokenInfo", underlyingTokenInfo);
        const underlyingToken = UNDERLYING_TOKENS.find(tok => tok.tokenId === filteredTokenId);
        if (underlyingToken) {
            console.log("setUnderlyingToken underlyingToken", underlyingToken);
            const oraclePrice = await getOraclePrice(underlyingToken.oracleNFTID);
            console.log("setUnderlyingToken oraclePrice", oraclePrice);
            this.setState({ underlyingTokenId: filteredTokenId, strikePrice: oraclePrice, oraclePrice: oraclePrice, underlyingTokenInfo: underlyingTokenInfo, underlyingOptionDef: undefined });
        } else {
            const tokenIssuerBox = await boxByIdv1(tokenId);
            var optionDef = undefined;
            if (tokenIssuerBox.address === OPTION_SCRIPT_ADDRESS) {
                optionDef = await OptionDef.create(tokenIssuerBox);
            }
            this.setState({ underlyingTokenId: filteredTokenId, oraclePrice: undefined, showPriceSimulation: false, underlyingTokenInfo: underlyingTokenInfo, underlyingOptionDef: optionDef });
        }
    };
    setOptionAmount = (amount) => { this.setState({ optionAmount: amount.replace(/[^0-9]/g, "") }); };
    setShareSize = (shareSize) => { this.setState({ shareSize: shareSize.replace(/[^0-9]/g, "") }); };
    setStrikePrice = (strikePrice) => { this.setState({ strikePrice: strikePrice.replace(/[^0-9.]/g, "") }); };
    setMaturityDate = (date) => { this.setState({ maturityDate: date }); };
    setPricingDate = (date) => { this.setState({ pricingDate: date }); };
    setSigma = (s) => { this.setState({ sigma: s.replace(/[^0-9]/g, "") }); };
    setK1 = (s) => { this.setState({ K1: s.replace(/[^0-9]/g, "") }); };
    setK2 = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };
    setTxFee = (s) => { this.setState({ txFee: s }); };
    togglePriceSimulation = (s) => { this.setState({ showPriceSimulation: !s }); }

    async mintOption() {
        try {
            const maturityDate = new Date(Date.UTC(this.state.maturityDate.getFullYear(), this.state.maturityDate.getMonth(), this.state.maturityDate.getDate(), this.state.maturityDate.getHours()));
            const optionTypeNum = OPTION_TYPES.find(o => o.label === this.state.optionType).id;
            const optionStyleNum = OPTION_STYLES.find(o => o.label === this.state.optionStyle).id;
            //const underlyingToken = this.state.walletTokens.find(tok => tok.tokenId === this.state.underlyingTokenId);
            await createOptionRequest(optionTypeNum, optionStyleNum, this.state.underlyingTokenId, this.state.optionAmount, this.state.shareSize,
                Math.round(this.state.strikePrice * NANOERG_TO_ERG), maturityDate, this.state.txFee);
        } catch (e) {
            console.log(e);
            errorAlert(e.toString())
        }
    }

    async componentDidMount() {
        console.log("componentDidMount");
        const addressBalance = await getBalanceForAddress(localStorage.getItem('address') ?? '');
        const walletTokens = addressBalance.confirmed.tokens;
        this.setState({ walletTokens: walletTokens });
        //console.log("addressBalance", addressBalance);
        await this.setUnderlyingTokenId(walletTokens[0].tokenId);
    }

    render() {
        const underlyingTokens = this.state.walletTokens.map(u_tok => { return { value: u_tok.tokenId, label: u_tok.name } });
        const txFees = TX_FEES.map(i => { return { value: i, label: formatERGAmount(i) } });
        const currentToken = this.state.walletTokens.find(tok => tok.tokenId === this.state.underlyingTokenId);
        console.log("currentToken", currentToken, Math.pow(10, currentToken?.decimals ?? 0))
        const mintFee = DAPP_UI_MINT_FEE + Math.floor(this.state.shareSize * this.state.optionAmount * this.state.strikePrice * NANOERG_TO_ERG * DAPP_UI_FEE / 1000);
        console.log("mintFee", currentToken, mintFee, Math.floor(this.state.shareSize * this.state.optionAmount * this.state.strikePrice * NANOERG_TO_ERG * DAPP_UI_FEE / 1000))
        var strikePricePrecision = 4;
        if (this.state.strikePrice < 100000) {
            strikePricePrecision = 9;
        }

        return (
            <Fragment >
                <div className="card zonemint p-1 m-2">

                    <div className='d-flex flex-row'>
                        <h4>Create an option</h4>
                        <HelpToolTip image={helpIcon} id='Create an option help' html={
                            <div>Create EIP-4 tokens, delivered to your wallet, that have the value of an option to buy (Call) or sell (Put) the underlying EIP-4 token.</div>
                        } />
                    </div>

                    <div className='card zonemint d-flex flex-column m-1 p-1'>
                        <Table >
                            <tbody>
                                <tr>
                                    <td>Type</td>
                                    <td>
                                        <div className='w-100'>
                                            <ThemedSelect id="optionType"
                                                value={this.state.optionType}
                                                onChange={(type) => this.setOptionType(type.value)}
                                                options={optionsTypes}
                                            />
                                        </div>
                                    </td>
                                    <td><small>{OPTION_TYPES.find(t => t.label === this.state.optionType).comment}</small></td>
                                </tr>
                                <tr>
                                    <td>Style</td>
                                    <td>
                                        <div className='w-100'>
                                            <ThemedSelect id="optionStyle"
                                                value={this.state.optionStyle}
                                                onChange={(type) => this.setOptionStyle(type.value)}
                                                options={optionsStyles}
                                            />
                                        </div>
                                    </td>
                                    <td><small>{OPTION_STYLES.find(s => s.label === this.state.optionStyle).comment}</small></td>
                                </tr>
                                <tr>
                                    <td>Underlying token</td>
                                    <td>
                                        {
                                            this.state.optionType === "Call" ?
                                                <div className='w-100 d-flex flex-row'>
                                                    <ThemedSelect id="underlyingToken"
                                                        value={currentToken?.name}
                                                        onChange={(tok) => this.setUnderlyingTokenId(tok.value)}
                                                        options={underlyingTokens}
                                                    />

                                                </div>
                                                :
                                                <div className='w-100 d-flex flex-column'>

                                                    <ThemedSelect id="underlyingToken"
                                                        value={currentToken?.name}
                                                        onChange={(tok) => this.setUnderlyingTokenId(tok.value)}
                                                        options={underlyingTokens}
                                                    />
                                                    <input type="text"
                                                        id="underlyingToken"
                                                        className="form-control col-sm input-dark"
                                                        onChange={e => this.setUnderlyingTokenId(e.target.value)}
                                                        value={this.state.underlyingTokenId}
                                                        autoComplete="off"
                                                    />
                                                </div>

                                        }
                                    </td>
                                    <td>
                                        {
                                            currentToken ?
                                                <div className='d-flex flex-row align-items-center'>
                                                    <small>Available {(currentToken.amount / Math.pow(10, currentToken.decimals)).toFixed(currentToken.decimals)}</small>
                                                    {
                                                        this.state.underlyingOptionDef ?
                                                            <OptionLink optionDef={this.state.underlyingOptionDef} />
                                                        :
                                                            <TokenLink tokenId={currentToken.tokenId} />
                                                    }

                                                </div>
                                                :
                                                this.state.underlyingTokenInfo ?
                                                    <TokenLink tokenId={this.state.underlyingTokenInfo.id} name={this.state.underlyingTokenInfo.name} />
                                                    :
                                                    <div></div>
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td>Amount</td>
                                    <td>
                                        <input type="text"
                                            id="optionAmount"
                                            className="form-control w-100 input-dark"
                                            onChange={e => this.setOptionAmount(e.target.value)}
                                            value={this.state.optionAmount}
                                            autoComplete="off"
                                        />
                                    </td>
                                    <td><small>Number of option(s) to create</small></td>
                                </tr>
                                <tr>
                                    <td>Share size</td>
                                    <td>
                                        <input type="text"
                                            id="shareSize"
                                            className="form-control w-100 input-dark"
                                            onChange={e => this.setShareSize(e.target.value)}
                                            value={this.state.shareSize}
                                            autoComplete="off"
                                        />
                                    </td>
                                    <td><small>Number of token(s) per option</small></td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className='d-flex flex-row'>
                                            <div>Strike price</div>
                                            <HelpToolTip image={helpIcon} id='strike price help' html={
                                                <div>Strike price in ERG</div>
                                            } />
                                        </div>
                                    </td>
                                    <td>
                                        <input type="text"
                                            id="strikePrice"
                                            className="form-control w-100 input-dark"
                                            onChange={e => this.setStrikePrice(e.target.value)}
                                            value={this.state.strikePrice}
                                            autoComplete="off"
                                        />

                                    </td>
                                    <td><small>ERG per token</small></td>
                                </tr>
                                <tr>
                                    <td>Maturity date</td>
                                    <td>
                                        <DatePicker
                                            className='input-dark form-control'
                                            selected={this.state.maturityDate}
                                            onChange={(date) => this.setMaturityDate(date)}
                                            dateFormat="Pp"
                                            excludeDateIntervals={[
                                                { start: 0, end: now },
                                                { start: now.addDays(MAX_UI_OPTION_DURATION), end: new Date("2999-12-31") }
                                            ]}
                                        />
                                    </td>
                                    <td><small>Expiration date of the grant</small></td>
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


                        <div className='w-100 d-flex flex-column align-items-center'>
                            <div className='w-75 gold-border m-2 p-2'>
                                <Table>
                                    <tbody>
                                        <tr>
                                            <td>Cost</td>
                                            <td>
                                                {
                                                    this.state.optionType === 'Call' && currentToken ?
                                                        <strong>
                                                            {formatERGAmount(4 * this.state.txFee + 2 * MIN_NANOERG_BOX_VALUE + mintFee)} -
                                                            {this.state.shareSize * this.state.optionAmount}
                                                            {" " + currentToken.name}
                                                        </strong>
                                                        :
                                                        <strong>
                                                            {formatERGAmount(4 * this.state.txFee + 2 * MIN_NANOERG_BOX_VALUE + mintFee + this.state.shareSize * this.state.optionAmount * this.state.strikePrice * NANOERG_TO_ERG)}
                                                        </strong>
                                                }
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Reward if exercised</td>
                                            <td>
                                                {
                                                    this.state.optionType === 'Call' ?
                                                        <strong>
                                                            {formatERGAmount(this.state.shareSize * this.state.optionAmount * this.state.strikePrice * NANOERG_TO_ERG)}
                                                        </strong>
                                                        :
                                                        <strong>
                                                            {this.state.shareSize * this.state.optionAmount}
                                                            {" " + this.state.underlyingTokenInfo?.name}
                                                        </strong>
                                                }
                                            </td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <div className='d-flex flex-row justify-content-center align-items-center m-2 p-2'>
                        <button className='btn btn-blue'
                            onClick={() => this.mintOption()}
                        >
                            Mint {this.state.underlyingOptionDef ? "compound" : null} option
                        </button>
                    </div>
                </div>
                <div className="card zonemint p-1 m-2">
                    {
                        this.state.showPriceSimulation && this.state.oraclePrice ?
                            <div>

                                <div className='d-flex flex-row justify-content-between'>
                                    <button className='btn' onClick={() => this.togglePriceSimulation(this.state.showPriceSimulation)}>
                                        <img src={expandLessIcon} alt="Hide price simulation" />
                                    </button>
                                    <h5>Option price simulation</h5>
                                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                                </div>
                                <div className='d-flex flex-column m-1 p-1 zonegraph'>
                                    <Table>
                                        <tbody>
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
                                        </tbody>
                                    </Table>
                                </div>
                                <div className='d-flex flex-wrap align-items-center'>
                                    <PriceCharts
                                        optionType={this.state.optionType}
                                        optionStyle={this.state.optionStyle}
                                        maturityDate={this.state.maturityDate}
                                        oraclePrice={this.state.oraclePrice}
                                        strikePrice={Math.round(this.state.strikePrice * NANOERG_TO_ERG)}
                                        shareSize={this.state.shareSize}
                                        sigma={this.state.sigma}
                                        K1={this.state.K1}
                                        K2={this.state.K2}
                                    />
                                </div>
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
            </Fragment >
        )
    }
}
