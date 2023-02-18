import React, { Fragment } from 'react';
import { createTokenBuyRequest, createTokenSellRequest, refundBuyRequest } from '../actions/BuyRequestActions';
import { promptOptionAmount } from '../utils/Alerts';
import { formatERGAmount } from '../utils/utils';
import AddressLink from './AddressLink';
import TokenLink from './TokenLink';

/* global BigInt */


async function refund(box) {
    const txId = await refundBuyRequest(box);
}

async function sellToken(tokenId, tokenAmount, tokenPrice) {
    console.log("sellToken", tokenId, tokenAmount, tokenPrice);
    const txId = await createTokenSellRequest(tokenId, tokenAmount, tokenPrice);
}

export default function BuyTokenCard(props) {
    const address = localStorage.getItem('address') ?? '';
    console.log("BuyTokenCard", props);
    const buyTokenRequest = props.buyTokenRequest;
    const tokenInfo = buyTokenRequest?.tokenInfo;
    const tokenDecimalFactor = Math.pow(10, tokenInfo?.decimals ?? 0);
    return (
        <Fragment>

            <div className="card sell-option-card d-flex flex-column m-1 p-1">
                <div className="w-100 d-flex flex-column align-items-center">
                    <div className='w-75 d-flex flex-column align-items-center gold-border m-2 p-2'>
                        <div>Buy {buyTokenRequest.tokenAmount / tokenDecimalFactor} <TokenLink tokenId={buyTokenRequest.tokenId} name={tokenInfo.name} /></div>
                        <div>at {formatERGAmount(buyTokenRequest.tokenPrice * tokenDecimalFactor)} per token</div>
                    </div>

                    <div className="w-100 d-flex flex-column m-2 p-2">
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Issuer</div>
                            <div><AddressLink address={buyTokenRequest.buyerAddress} /></div>
                        </div>
                        <div className="w-100 d-flex flex-row justify-content-between">
                            <div>Total price</div>
                            <div>{formatERGAmount(buyTokenRequest.buyRequestValue)}</div>
                        </div>
                    </div>
                </div>
                <div className="w-100 d-flex flex-row justify-content-center">
                    <button className='btn btn-blue m-2 p-2'
                        onClick={() => sellToken(buyTokenRequest.tokenId, buyTokenRequest.tokenAmount / tokenDecimalFactor, buyTokenRequest.tokenPrice * tokenDecimalFactor )}>
                        Sell
                    </button>

                    <button className='btn btn-blue m-2 p-2'
                        onClick={() => refund(buyTokenRequest.full)}
                        disabled={buyTokenRequest.buyerAddress !== address}
                    >
                        Refund
                    </button>
                </div>
            </div>
        </Fragment>
    )
}
