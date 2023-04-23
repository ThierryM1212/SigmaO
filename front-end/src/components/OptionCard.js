import React, { Fragment } from 'react';
import { OPTION_STYLES, OPTION_TYPES } from '../utils/constants';
import { formatERGAmount } from '../utils/utils';
import TokenImage from './TokenImage';
import CalendarIcon from '../images/event_white_24dp.svg';
import StrikePriceIcon from '../images/currency_exchange_white_24dp.svg';
import ShareSizeIcon from '../images/incomplete_circle_white_24dp.svg';
import IntrinsicPriceIcon from '../images/attach_money_white_24dp.svg';
import ReserveIcon from '../images/account_balance_white_24dp.svg';
import ErrorIcon from '../images/error_outline_white_24dp.svg';
import HelpToolTip from './HelpToolTip';
import { exerciseOptionRequest } from '../actions/userOptionActions';
import { promptOptionAmount } from '../utils/Alerts';
import OptionLink from './OptionLink';
import TokenLink from './TokenLink';
import OptionTokenImage from './OptionTokenImage';

async function exerciseOption(optionTokenId, maxAmount) {
    const amount = await promptOptionAmount("Option amount to exercise", maxAmount);
    await exerciseOptionRequest(optionTokenId, amount);
}

export default function OptionCard(props) {
    console.log("OptionCard", props);
    const option = props.option;
    const optionDef = props.option?.optionDef ?? props.option;
    const oraclePrice = props?.oraclePrice;
    const underlyingTokendecimalFactor = Math.pow(10, optionDef?.underlyingTokenInfo?.decimals ?? 0);
    const walletOptionAmountRaw = props.walletOptionAmount ?? 0;
    const walletOptionAmount = (walletOptionAmountRaw / underlyingTokendecimalFactor).toFixed(optionDef?.underlyingTokenInfo?.decimals ?? 0);
    console.log("optionDef", optionDef)
    return (
        <Fragment>
            <div className="card option-card d-flex flex-column justify-content-between align-items-center h-100">
                {
                    optionDef ?
                        <Fragment>
                            <div className='d-flex flex-column w-100 align-items-start m-2 p-2 '>
                                {
                                    optionDef.isCompoundOption ?
                                        <div className='d-flex flex-row align-items-center justify-content-start'>
                                            <div className='m-1'><OptionTokenImage width={72} tokenId={optionDef.optionTokenId} underlyingTokenId={optionDef.underlyingOptionDef.underlyingTokenId} /></div>
                                            <div className='d-flex flex-column'>
                                                <div className='d-flex flex-row'>
                                                    <div className='m-1'>{OPTION_STYLES.find(s => s.id === optionDef.optionStyle).label}</div>
                                                    <div className='m-1'>{OPTION_TYPES.find(t => t.id === optionDef.optionType).label}</div>
                                                    <div className='m-1'>on</div>
                                                    <div className='m-1'>{OPTION_TYPES.find(t => t.id === optionDef.underlyingOptionDef.optionType).label}</div>
                                                </div>
                                                <div className='m-1'>{optionDef.underlyingOptionDef.underlyingTokenInfo.name}</div>
                                            </div>
                                        </div>
                                        :
                                        <div className='d-flex flex-row align-items-center justify-content-start'>
                                            <div className='m-1'><OptionTokenImage width={72} tokenId={optionDef.optionTokenId} underlyingTokenId={optionDef.underlyingTokenId} /></div>
                                            <div className='d-flex flex-column'>
                                                <div className='d-flex flex-row'>
                                                    <div className='m-1'>{OPTION_STYLES.find(s => s.id === optionDef.optionStyle).label}</div>
                                                    <div className='m-1'>{OPTION_TYPES.find(t => t.id === optionDef.optionType).label}</div>
                                                </div>
                                                <div className='m-1'>{optionDef.underlyingTokenInfo.name}</div>
                                            </div>
                                        </div>
                                }


                                <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                    <HelpToolTip
                                        image={StrikePriceIcon}
                                        id="StrikePriceIcon"
                                        html={<div>Strike price: Amount of ERG per token to exercise the option</div>}
                                    />
                                    <div className='d-flex flex-column align-items-end'>
                                        <div>{formatERGAmount(optionDef.strikePrice * underlyingTokendecimalFactor)}<small>&nbsp;per</small></div>
                                        {
                                            optionDef.isCompoundOption ?
                                                <OptionLink optionDef={optionDef.underlyingOptionDef} />

                                                :
                                                <small >
                                                    <TokenLink tokenId={optionDef.underlyingTokenInfo.id}
                                                        name={optionDef.underlyingTokenInfo.name} />
                                                </small>
                                        }
                                    </div>
                                </div>

                                {
                                    option.exercibleOptionAmount > 0 ?
                                        <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                            <HelpToolTip
                                                image={ReserveIcon}
                                                id="ReserveIcon"
                                                html={<div>Available reserve to exercise the options</div>}
                                            />
                                            <div>
                                                {option.exercibleOptionAmount}
                                                <small> options</small>
                                            </div>
                                        </div>
                                        : null
                                }

                                <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                    <HelpToolTip
                                        image={CalendarIcon}
                                        id="CalendarIcon"
                                        html={<div>Maturity date: {
                                            optionDef.optionStyle === 0 ? // European
                                                <div>the option can be exercised during 24h at that date (UTC)</div>
                                                :
                                                <div>the option can be exercised up to that date (UTC)</div>
                                        }</div>}
                                    />
                                    <div>
                                        {(new Date(optionDef.maturityDate)).toISOString().substring(0, 10)}
                                        &nbsp;
                                        (~{Math.round(((new Date(optionDef.maturityDate)).getTime() - (new Date()).getTime()) / (1000 * 3600 * 24))} days)
                                    </div>
                                </div>

                                <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                    <HelpToolTip
                                        image={ShareSizeIcon}
                                        id="ShareSizeIcon"
                                        html={<div>Share size: Amount of underlying token per option</div>}
                                    />
                                    <div>
                                        {optionDef.shareSize} {optionDef.underlyingTokenInfo.name}
                                        <small> per option</small>
                                    </div>
                                </div>

                                {
                                    oraclePrice ?
                                        <Fragment>
                                            <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                                <HelpToolTip
                                                    image={IntrinsicPriceIcon}
                                                    id="IntrinsicPriceIcon"
                                                    html={<div>Intrinsic price: value of the option if exercised now</div>}
                                                />
                                                <div>
                                                    {formatERGAmount(optionDef.getIntrinsicPrice(oraclePrice))}
                                                    <small> per option</small>
                                                </div>
                                            </div>
                                            <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                                <div>
                                                    Oracle <TokenImage tokenId={optionDef.underlyingTokenId} id={optionDef.underlyingTokenId} width={24} />
                                                </div>
                                                <div>
                                                    <div>{formatERGAmount(oraclePrice)}<small> per </small></div>
                                                    <div>{optionDef.underlyingTokenInfo.name}</div>
                                                </div>
                                            </div>
                                        </Fragment>
                                        : null
                                }

                                {
                                    optionDef.isExpired ?
                                        <Fragment>
                                            <div className='w-100 d-flex flex-row align-items-center justify-content-between'>
                                                <HelpToolTip 
                                                    image={ErrorIcon}
                                                    id="ErrorIcon"
                                                    html={<div>The option is expired and cannot be exercised anymore.</div>}
                                                />
                                                <div>
                                                    <b className='red-text'>Caution, the option is expired and worth nothing !</b>
                                                </div>
                                            </div>
                                        </Fragment>
                                        : null
                                }
                            </div>
                            {
                                props.showExercise ?
                                    <div className='w-100 d-flex flex-row align-items-center justify-content-center m-2 p-2'>
                                        <button className='btn btn-blue'
                                            disabled={walletOptionAmount <= 0}
                                            onClick={() => exerciseOption(optionDef.optionTokenId, walletOptionAmount)}
                                        >
                                            Exercise
                                        </button>
                                        {
                                            walletOptionAmount > 0 ?
                                                <small>({walletOptionAmount} available)</small>
                                                : null
                                        }

                                    </div>
                                    : null
                            }
                        </Fragment>
                        : null
                }
            </div>
        </Fragment>

    )
}
