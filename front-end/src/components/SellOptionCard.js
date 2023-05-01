import React, { Fragment } from 'react';
import { formatERGAmount, getOptionPrice } from '../utils/utils';
import { promptOptionAmount } from '../utils/Alerts';
import OptionCard from './OptionCard';
import { createBuyOptionRequest, refundSellOption } from '../actions/BuyRequestActions';
import AddressLink from './AddressLink';


async function buyOption(sellRequest, optionPrice, maxAmount) {
    console.log("buyOption", sellRequest, "optionPrice", optionPrice)
    const optionAmount = await promptOptionAmount("Amount of option to buy", maxAmount);
    await createBuyOptionRequest(sellRequest,
        optionAmount,
        Math.floor(parseInt(optionPrice) * 1.01)); // 1% slippage TO DO configure
}

async function refund(box) {
    //console.log("refund", box)
    const txId = await refundSellOption(box);
    console.log("refund sell option txId", txId);
}

export default function SellOptionCard(props) {
    const address = localStorage.getItem('address') ?? '';
    //console.log("SellOptionCard", props);
    const sellOptionRequest = props.sellOptionRequest;
    const optionDef = sellOptionRequest.option.optionDef;
    var oraclePrice = sellOptionRequest.currentOraclePrice;
    const underlyingTokenInfo = optionDef.underlyingTokenInfo;
    const optionPrice = getOptionPrice(optionDef.optionType, optionDef.optionStyle, (new Date()).valueOf(), optionDef.maturityDate,
        oraclePrice, optionDef.strikePrice * Math.pow(10, underlyingTokenInfo.decimals), optionDef.shareSize, sellOptionRequest.sigma, sellOptionRequest.K1, sellOptionRequest.K2);

    //console.log("SellOptionCard", props);
    const availableOptionAmount = sellOptionRequest.optionAmount / Math.pow(10, underlyingTokenInfo.decimals);
    return (
        <Fragment>

            <div className="card sell-option-card d-flex flex-column m-1 p-1">
                <div className="w-100 d-flex flex-column align-items-center">
                    <div className='w-100 gold-border m-2 p-2 d-flex flex-column align-items-center'>
                        <div>{formatERGAmount(sellOptionRequest.currentOptionPrice)} <small>per option</small></div>
                    </div>
                    {
                        optionDef ?
                            <div>
                                <OptionCard option={sellOptionRequest.option}
                                    oraclePrice={sellOptionRequest.currentOraclePrice}
                                    showExercise={false} />
                            </div>
                            : null
                    }
                    <div className="w-100 d-flex flex-column m-2 p-2">
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Available</div>
                            <div>{availableOptionAmount} options</div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Issuer</div>
                            <div><AddressLink address={sellOptionRequest.sellerAddress} /></div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Sigma</div>
                            <div>{sellOptionRequest.sigma / 10} %</div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>K1</div>
                            <div>{sellOptionRequest.K1 / 10} %</div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>K2</div>
                            <div>{sellOptionRequest.K2 / 10} %</div>
                        </div>
                    </div>
                </div>
                <div className="w-100 d-flex flex-row justify-content-center">
                    <button className='btn btn-blue m-2' onClick={() => buyOption(sellOptionRequest, optionPrice, availableOptionAmount)}>Buy</button>
                    <button className='btn btn-blue m-2'
                        onClick={() => refund(sellOptionRequest.full)}
                        disabled={sellOptionRequest.sellerAddress !== address}
                    >
                        Refund
                    </button>
                </div>
            </div>
        </Fragment>

    )

}
