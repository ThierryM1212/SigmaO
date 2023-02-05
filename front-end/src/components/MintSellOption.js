import React, { Fragment } from 'react';
import { DAPP_UI_FEE, DAPP_UI_MINT_FEE, MIN_NANOERG_BOX_VALUE, OPTION_STYLES, OPTION_TYPES, TX_FEE } from '../utils/constants';
import ThemedSelect from './ThemedSelect';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { errorAlert } from '../utils/Alerts';
import { createSellOption, test } from '../actions/BuyRequestActions';
import { createOptionRequest } from "../actions/userOptionActions";
import { boxByIdv1, getBalanceForAddress, getOraclePrice, getTokensForAddress } from '../ergo-related/explorer';
import { OptionPriceTimeChart } from './OptionPriceTimeChart';
import { formatERGAmount } from '../utils/utils';
import { OptionPriceUnderlyingPriveChart } from './OptionPriceUnderlyingPriveChart';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { addressToErgoTree } from '../ergo-related/serializer';
import { OptionDef } from '../objects/OptionDef';
import OptionDefinition from './OptionDefinition';
import { getWalletOptionsDef } from '../utils/option_utils';



export default class MintSellOption extends React.Component {
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
            walletOptionsDef: [],
        };

        this.setSigma = this.setSigma.bind(this);
        this.setK1 = this.setK1.bind(this);
        this.setK2 = this.setK2.bind(this);
        this.setOptionAmount = this.setOptionAmount.bind(this);
        this.setFreezeDelay = this.setFreezeDelay.bind(this);
        this.setOptionToken = this.setOptionToken.bind(this);
    }

    setSigma = (s) => { this.setState({ sigma: s.replace(/[^0-9]/g, "") }); };
    setK1 = (s) => { this.setState({ K1: s.replace(/[^0-9]/g, "") }); };
    setFreezeDelay = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };
    setK2 = (s) => { this.setState({ K2: s.replace(/[^0-9]/g, "") }); };
    setOptionAmount = (s) => { this.setState({ optionAmount: s.replace(/[^0-9]/g, "") }); };
    setOptionToken = (s) => { this.setState({ optionToken: s }); };

    async mintSellOption() {
        try {
            const optionTokenId = this.state.walletOptionsDef.find(tok => tok.optionName === this.state.optionToken.optionName).optionTokenId;
            //console.log("mintSellOption", optionTokenId, this.state.walletOptionsDef);
            await createSellOption(optionTokenId, this.state.optionAmount, this.state.sigma, this.state.K1, this.state.K2, this.state.freezeDelayHour);
        } catch (e) {
            console.log(e);
            errorAlert(e.toString())
        }
    }

    async componentDidMount() {
        console.log("componentDidMount");
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const walletTokens = await getTokensForAddress(address);
            const walletOptionDefs = await getWalletOptionsDef(walletTokens);
            //console.log("walletOptionDefs", walletOptionDefs)
            this.setState({ walletOptionsDef: walletOptionDefs, optionToken: walletOptionDefs[0], walletTokens: walletTokens })
        } else {
            errorAlert("ERG address not set")
        }
    }

    render() {
        const optionTokens = this.state.walletOptionsDef.map(u_tok => { return { value: u_tok.optionTokenId, label: u_tok.optionName } });
        const currentOption = this.state.walletOptionsDef.find(o => o?.optionTokenId === this.state.optionToken?.optionTokenId);
        const currentToken = this.state.walletTokens.find(o => o.tokenId === currentOption?.optionTokenId);
        //console.log("render SellOption", this.state, optionTokens, currentOption)
        return (
            <Fragment >
                <div className="card zonemint p-1 m-2">
                    <div className='card zonemint d-flex flex-column m-2 p-2'>
                        <div className='d-flex flex-row justify-content-between align-items-end'>
                            <label htmlFor="optionToken" className='col-sm-2 d-flex align-items-start'>Option token</label>
                            <div className='w-100 d-flex flex-row'>
                                <ThemedSelect id="optionToken"
                                    value={currentOption?.optionName}
                                    onChange={(tok) => this.setOptionToken(this.state.walletOptionsDef.find(o => o?.optionTokenId === tok.value))}
                                    options={optionTokens}
                                />
                                {
                                    currentToken ?
                                        <div>(Available {(currentToken.amount / Math.pow(10, currentToken.decimals)).toFixed(currentToken.decimals)})</div>
                                        :
                                        <div></div>
                                }
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
                        <div className='d-flex flex-row justify-content-start align-items-end'>
                            <label htmlFor="freezeDelay" className='col-sm-2 d-flex justify-content-start align-items-start'>Freeze delay (h)</label>
                            <input type="text"
                                id="freezeDelay"
                                className="form-control col-sm-2 input-dark"
                                onChange={e => this.setFreezeDelay(e.target.value)}
                                value={this.state.freezeDelayHour}
                                autoComplete="off"
                            />
                        </div>

                        <div className='d-flex flex-row justify-content-center'>
                            <strong>
                                Cost: &nbsp;

                            </strong>
                        </div>
                        <OptionDefinition optionDef={currentOption} />
                    </div>
                    <div className='d-flex flex-row justify-content-center align-items-center'>
                        <button className='btn btn-blue'
                            onClick={() => this.mintSellOption()}
                        >
                            Sell Options
                        </button>
                    </div>


                </div >
            </Fragment >
        )
    }
}
