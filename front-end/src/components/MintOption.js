import React, { Fragment } from 'react';
import { DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, OPTION_STYLES, OPTION_TYPES, TX_FEE, UNDERLYING_TOKENS } from '../utils/constants';
import ThemedSelect from './ThemedSelect';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { errorAlert } from '../utils/Alerts';
import { createOptionRequest, test } from '../ergo-related/mint';
import { getOraclePrice } from '../ergo-related/explorer';
import { OptionPriceTimeChart } from './OptionPriceTimeChart';
import { formatERGAmount } from '../utils/utils';
import { OptionPriceUnderlyingPriveChart } from './OptionPriceUnderlyingPriveChart';


const optionsTypes = OPTION_TYPES.map(opt_type => { return { value: opt_type.label, label: opt_type.label } });
const optionsStyles = OPTION_STYLES.map(opt_style => { return { value: opt_style.label, label: opt_style.label } });
const underlyingTokens = UNDERLYING_TOKENS.map(u_tok => { return { value: u_tok.label, label: u_tok.label } });
var initMaturityDate = new Date(new Date().toDateString());
//initMaturityDate.setTime(0);
initMaturityDate.setDate(initMaturityDate.getDate() + 91);

export default class MintOption extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            optionType: optionsTypes[0].label,
            optionStyle: optionsStyles[0].label,
            underlyingToken: underlyingTokens[0].label,
            optionAmount: 10,
            shareSize: 1,
            strikePrice: 1000000,
            maturityDate: initMaturityDate,
            pricingDate: new Date(),
            sigma: 500,
            K1: 700,
            K2: 100,
            oraclePrice: 1000000,
            oraclePriceGraph: 1000000,
        };
        this.setOptionType = this.setOptionType.bind(this);
        this.setOptionStyle = this.setOptionStyle.bind(this);
        this.setUnderlyingToken = this.setUnderlyingToken.bind(this);
        this.setOptionAmount = this.setOptionAmount.bind(this);
        this.setShareSize = this.setShareSize.bind(this);
        this.setStrikePrice = this.setStrikePrice.bind(this);
        this.setMaturityDate = this.setMaturityDate.bind(this);
        this.setPricingDate = this.setPricingDate.bind(this);
        this.setSigma = this.setSigma.bind(this);
        this.setK1 = this.setK1.bind(this);
        this.setK2 = this.setK2.bind(this);
    }

    setOptionType = (type) => { this.setState({ optionType: type, }); };
    setOptionStyle = (style) => { this.setState({ optionStyle: style, }); };
    async setUnderlyingToken(tokName)  {
        console.log("setUnderlyingToken", tokName, UNDERLYING_TOKENS);
        const underlyingToken = UNDERLYING_TOKENS.find(tok => tok.label === tokName);
        console.log("setUnderlyingToken underlyingToken", underlyingToken);
        const oraclePrice = await getOraclePrice(underlyingToken.oracleNFTID);
        console.log("setUnderlyingToken oraclePrice", oraclePrice);
        this.setState({ underlyingToken: tokName, strikePrice: oraclePrice, oraclePrice: oraclePrice, oraclePriceGraph: oraclePrice });

    };
    setOptionAmount = (amount) => { this.setState({ optionAmount: amount.replace(/[^0-9]/g, "") }); };
    setShareSize = (shareSize) => { this.setState({ shareSize: shareSize.replace(/[^0-9]/g, "") }); };
    setStrikePrice = (strikePrice) => { this.setState({ strikePrice: strikePrice.replace(/[^0-9]/g, "") }); };
    setOraclePriceGraph = (oraclePrice) => { this.setState({ oraclePriceGraph: oraclePrice.replace(/[^0-9]/g, "") }); };
    setMaturityDate = (date) => { this.setState({ maturityDate: date }); };
    setPricingDate = (date) => { this.setState({ pricingDate: date }); };
    setSigma = (s) => { this.setState({ sigma: s.replace(/[^0-9]/g, "") }); };
    setK1 = (s) => { this.setState({ K1: s.replace(/[^0-9]/g, "") }); };
    setK2 = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };


    async mintOption() {
        try {
            //console.log(this.state.maturityDate.toLocaleString());
            const maturityDate = new Date(Date.UTC(this.state.maturityDate.getFullYear(), this.state.maturityDate.getMonth(), this.state.maturityDate.getDate(), this.state.maturityDate.getHours()));

            const optionTypeNum = OPTION_TYPES.find(o => o.label === this.state.optionType).id;
            const optionStyleNum = OPTION_STYLES.find(o => o.label === this.state.optionStyle).id;
            //console.log("optionStyle", this.state.optionStyle, optionStyleNum);
            const underlyingToken = UNDERLYING_TOKENS.find(tok => tok.label === this.state.underlyingToken);

            await createOptionRequest(optionTypeNum, optionStyleNum, underlyingToken, this.state.optionAmount, this.state.shareSize,
                this.state.strikePrice, maturityDate, this.state.sigma, this.state.K1, this.state.K2);
        } catch (e) {
            console.log(e);
            errorAlert(e.toString())
        }
    }

    async componentDidMount() {
        await this.setUnderlyingToken(this.state.underlyingToken);
    }

    render() {
        return (
            <Fragment >
                <div className="card zonemint p-1 m-2">
                    <div className='card zonemint d-flex flex-column m-2 p-2'>
                        <div className='d-flex flex-row justify-content-between align-items-end'>
                            <label htmlFor="optionType" className='col-sm-2 d-flex align-items-start'>Type</label>
                            <div className='w-100 d-flex flex-row'>
                                <ThemedSelect id="optionType"
                                    value={this.state.optionType}
                                    onChange={(type) => this.setOptionType(type.value)}
                                    options={optionsTypes}
                                />
                                <div></div>
                            </div>
                        </div>
                        <div className='d-flex flex-row justify-content-between align-items-end'>
                            <label htmlFor="optionStyle" className='col-sm-2 d-flex align-items-start'>Style</label>
                            <div className='w-100 d-flex flex-row'>
                                <ThemedSelect id="optionStyle"
                                    value={this.state.optionStyle}
                                    onChange={(type) => this.setOptionStyle(type.value)}
                                    options={optionsStyles}
                                />
                                <div></div>
                            </div>
                        </div>
                        <div className='d-flex flex-row justify-content-between align-items-end'>
                            <label htmlFor="underlyingToken" className='col-sm-2 d-flex align-items-start'>Underlying token</label>
                            <div className='w-100 d-flex flex-row'>
                                <ThemedSelect id="underlyingToken"
                                    value={this.state.underlyingToken}
                                    onChange={(tok) => this.setUnderlyingToken(tok.value)}
                                    options={underlyingTokens}
                                />
                                <div></div>
                            </div>
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="optionAmount" className='col-sm-2 d-flex justify-content-start align-items-start'>Option amount</label>
                            <input type="text"
                                id="optionAmount"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setOptionAmount(e.target.value)}
                                value={this.state.optionAmount}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="sharesize" className='col-sm-2 d-flex justify-content-start align-items-start'>Share size</label>
                            <input type="text"
                                id="sharesize"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setShareSize(e.target.value)}
                                value={this.state.shareSize}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="strikePrice" className='col-sm-2 d-flex justify-content-start align-items-start'>Strike price</label>
                            <input type="text"
                                id="strikePrice"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setStrikePrice(e.target.value)}
                                value={this.state.strikePrice}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="maturityDate" className='col-sm-2 d-flex justify-content-start align-items-start'>Maturity date</label>
                            <div>
                                <DatePicker
                                    className='input-dark form-control'
                                    selected={this.state.maturityDate}
                                    onChange={(date) => this.setMaturityDate(date)}
                                    dateFormat="Pp"
                                    excludeDateIntervals={[{ start: 0, end: new Date() }]}
                                />
                            </div>
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="sigma" className='col-sm-2 d-flex justify-content-start align-items-start'>Sigma (‰)</label>
                            <input type="text"
                                id="sigma"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setSigma(e.target.value)}
                                value={this.state.sigma}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="K1" className='col-sm-2 d-flex justify-content-start align-items-start'>K1 (‰)</label>
                            <input type="text"
                                id="K1"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setK1(e.target.value)}
                                value={this.state.K1}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="K2" className='col-sm-2 d-flex justify-content-start align-items-start'>K2 (‰)</label>
                            <input type="text"
                                id="K2"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setK2(e.target.value)}
                                value={this.state.K2}
                                autoComplete="off"
                            />
                        </div>
                        <div className='d-flex flex-row justify-content-center'>
                            <strong>
                                Cost: &nbsp;
                                {
                                    this.state.optionType === 'Call' ?
                                        <div>
                                            {formatERGAmount(3 * TX_FEE + MIN_NANOERG_BOX_VALUE + DAPP_UI_MINT_FEE)} ERG -
                                            {(this.state.shareSize * this.state.optionAmount + 1 /
                                                Math.pow(10, UNDERLYING_TOKENS.find(tok => tok.label === this.state.underlyingToken).decimals))
                                                .toFixed(UNDERLYING_TOKENS.find(tok => tok.label === this.state.underlyingToken).decimals)}
                                            {" " + this.state.underlyingToken}
                                        </div>
                                        :
                                        <div>
                                            {formatERGAmount(3 * TX_FEE + MIN_NANOERG_BOX_VALUE + DAPP_UI_MINT_FEE + this.state.shareSize * this.state.optionAmount * this.state.strikePrice)} ERG
                                        </div>
                                }
                            </strong>
                        </div>
                    </div>
                    <div className='d-flex flex-row justify-content-center align-items-center'>
                        <button className='btn btn-blue'
                            onClick={() => this.mintOption()}
                        >
                            Mint Option
                        </button>
                        <button className='btn btn-blue'
                            onClick={() => test()}
                        >
                            test
                        </button>
                    </div>
                    <div className='d-flex flex-wrap m-1 p-1 align-items-center'>
                        <div className='d-flex flex-column m-1 p-1 zonegraph'>
                            <div className='d-flex flex-row justify-content-start align-items-end m-1 p-1'>
                                <label htmlFor="underlyingPrice" className='d-flex justify-content-start align-items-start'>Underlying price</label>
                                &nbsp;
                                <input type="text"
                                    id="underlyingPrice"
                                    className="form-control input-dark col-sm-4"
                                    onChange={e => this.setOraclePriceGraph(e.target.value)}
                                    value={this.state.oraclePriceGraph}
                                    autoComplete="off"
                                />
                            </div>
                            <div className='graph-container'>
                                <OptionPriceTimeChart
                                    optionType={this.state.optionType}
                                    optionStyle={this.state.optionStyle}
                                    maturityDate={this.state.maturityDate}
                                    oraclePrice={this.state.oraclePriceGraph}
                                    strikePrice={this.state.strikePrice}
                                    shareSize={this.state.shareSize}
                                    sigma={this.state.sigma}
                                    K1={this.state.K1}
                                    K2={this.state.K2}
                                    showBSBench={true}
                                    showBSError={true}
                                    showBinomialBench={true}
                                    showTreeError={true}
                                />
                            </div>
                        </div>
                        <div className='d-flex flex-column m-1 p-1 zonegraph'>
                            <div className='d-flex flex-row justify-content-start align-items-end m-1 p-1'>
                                <label htmlFor="pricingDate" className='d-flex justify-content-start align-items-start'>Pricing date</label>
                                &nbsp;
                                <div>
                                    <DatePicker
                                        className='input-dark form-control'
                                        selected={this.state.pricingDate}
                                        onChange={(date) => this.setPricingDate(date)}
                                        dateFormat="Pp"
                                        excludeDateIntervals={[{ start: 0, end: new Date() }]}
                                    />
                                </div>
                            </div>
                            <div className='graph-container'>
                                <OptionPriceUnderlyingPriveChart
                                    optionType={this.state.optionType}
                                    optionStyle={this.state.optionStyle}
                                    maturityDate={this.state.maturityDate}
                                    oraclePrice={this.state.oraclePrice}
                                    strikePrice={this.state.strikePrice}
                                    shareSize={this.state.shareSize}
                                    sigma={this.state.sigma}
                                    K1={this.state.K1}
                                    K2={this.state.K2}
                                    pricingDate={this.state.pricingDate}
                                />
                            </div>
                        </div>
                    </div>
                </div >
            </Fragment >
        )
    }
}
