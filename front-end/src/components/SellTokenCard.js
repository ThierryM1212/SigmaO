import React, { Fragment } from 'react';
import { createTokenBuyRequest, refundBuyRequest } from '../actions/BuyRequestActions';
import { promptOptionAmount } from '../utils/Alerts';
import { formatERGAmount } from '../utils/utils';
import AddressLink from './AddressLink';
import OptionLink from './OptionLink';
import TokenLink from './TokenLink';


async function buyToken(tokenId, maxAmount, tokenPrice, txFee, dAppUIFee) {
    //console.log("buyToken", tokenId, maxAmount, tokenPrice, txFee, dAppUIFee);
    const tokenAmount = await promptOptionAmount("Amount of tokens to buy", maxAmount);
    const txId = await createTokenBuyRequest(tokenId, tokenAmount, tokenPrice, txFee, dAppUIFee)
    console.log("buyToken txId", txId);
}

async function refund(box) {
    const txId = await refundBuyRequest(box);
    console.log("refund buy token txId", txId);
}

export default function SellTokenCard(props) {
    const address = localStorage.getItem('address') ?? '';
    //console.log("SellTokenCard", props);
    const sellTokenRequest = props.sellTokenRequest;
    const tokenInfo = sellTokenRequest.tokenInfo;
    const tokenDecimalFactor = Math.pow(10, tokenInfo?.decimals ?? 0);
    return (
        <Fragment>

            <div className="card sell-option-card d-flex flex-column m-1 p-1">
                <div className="w-100 d-flex flex-column align-items-center">
                    <div className='w-100 d-flex flex-column align-items-center gold-border m-2 p-2'>
                        <div className="w-100 d-flex flex-column align-items-center">
                            <div>{formatERGAmount(sellTokenRequest.tokenPrice * tokenDecimalFactor)}</div>
                            <small> per </small>
                            {
                                sellTokenRequest.optionDef ?
                                    <OptionLink optionDef={sellTokenRequest.optionDef} />
                                    :
                                    <TokenLink tokenId={sellTokenRequest.tokenId} name={tokenInfo?.name} />
                            }

                        </div>
                    </div>

                    <div className="w-100 d-flex flex-column m-2 p-2">
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Available</div>
                            <div>{sellTokenRequest.tokenAmount / tokenDecimalFactor} </div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Issuer</div>
                            <div><AddressLink address={sellTokenRequest.sellerAddress} /></div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Miner Fee</div>
                            <div>{formatERGAmount(sellTokenRequest.txFee)}</div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>dApp UI fee</div>
                            <div>{parseFloat(sellTokenRequest.dAppUIFee/10).toFixed(2)} %</div>
                        </div>
                    </div>

                </div>
                <div className="w-100 d-flex flex-row justify-content-center">
                    <button className='btn btn-blue m-2 p-2' onClick={() => buyToken(sellTokenRequest.tokenId, 
                        sellTokenRequest.tokenAmount / tokenDecimalFactor, 
                        sellTokenRequest.tokenPrice,
                        sellTokenRequest.txFee,
                        sellTokenRequest.dAppUIFee
                        )}>Buy</button>
                    <button className='btn btn-blue m-2 p-2'
                        onClick={() => refund(sellTokenRequest.full)}
                        disabled={sellTokenRequest.sellerAddress !== address}
                    >
                        Refund
                    </button>
                </div>
            </div>
        </Fragment>
    )
}
