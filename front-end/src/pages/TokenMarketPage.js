import React from 'react';
import { boxByIdv1, getOraclePrice, getTokenInfo, getTokensForAddress, getUnspentBoxesForAddressUpdated } from '../ergo-related/explorer';
import { SellOptionRequest } from '../objects/SellOptionRequest';
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { SellTokenRequest } from '../objects/SellTokenRequest';
import { BuyTokenRequest } from '../objects/BuyTokenRequest';
import { Table } from 'react-bootstrap';
import LoadingImage from '../components/LoadingImage';
import OptionLink from '../components/OptionLink';
import TokenLink from '../components/TokenLink';
import { OptionDef } from '../objects/OptionDef';
import { promptOptionAmount } from '../utils/Alerts';
import { createBuyOptionRequest, createTokenBuyRequest, createTokenSellRequest } from '../actions/BuyRequestActions';
import { formatERGAmount } from '../utils/utils';
import addIcon from "../images/add_circle_outline_black_48dp.png";
import { getAMMPrices } from '../ergo-related/amm';
import TokenPriceAmount from '../components/TokenPriceAmount';
import HelpToolTip from '../components/HelpToolTip';
import helpIcon from '../images/help_outline_blue_48dp.png';

/* global BigInt */

export default class TokenMarketPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sellOptionRequestsList: undefined,
            sellTokenRequestsList: undefined,
            buyTokenRequestsList: undefined,
            tokenRequests: undefined,
            AMMPrices: [],
            walletTokens: [],
        };
        this.fetchTokenMarket = this.fetchTokenMarket.bind(this);
    }

    async buyToken(tokenId, maxAmount, tokenPrice) {
        const tokenAmount = await promptOptionAmount("Amount of tokens to buy", maxAmount);
        const txId = await createTokenBuyRequest(tokenId, tokenAmount, tokenPrice);
        console.log("buyToken txId", txId);
    }

    async sellToken(tokenId, tokenAmount, tokenPrice) {
        console.log("sellToken", tokenId, tokenAmount, tokenPrice);
        const txId = await createTokenSellRequest(tokenId, tokenAmount, tokenPrice);
        console.log("sellToken txId", txId);
    }

    async buyOption(sellRequest, optionPrice, maxAmount) {
        console.log("buyOption", sellRequest, "optionPrice", optionPrice)
        const optionAmount = await promptOptionAmount("Amount of option to buy", maxAmount);
        await createBuyOptionRequest(sellRequest,
            optionAmount,
            Math.floor(parseInt(optionPrice) * 1.01)); // 1% slippage TO DO configure
    }

    async fetchTokenMarket() {
        const address = localStorage.getItem('address') ?? '';
        const sellScriptAddresses = UNDERLYING_TOKENS.map(t => t.sellOptionScriptAddress);
        var walletTokens = [];
        if (address !== '') {
            walletTokens = await getTokensForAddress(address);
        }
        const [AMMPrices,
            sellOptionsRequestsBoxes,
            sellTokenRequestsBoxes,
            buyTokenRequestsBoxes,
        ] = [await getAMMPrices(),
        (await Promise.all(sellScriptAddresses.map(async addr => getUnspentBoxesForAddressUpdated(addr)))).flat(),
        await getUnspentBoxesForAddressUpdated(SELL_FIXED_SCRIPT_ADDRESS),
        await getUnspentBoxesForAddressUpdated(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS),
            ];
        const sellOptionsRequests = await Promise.all(sellOptionsRequestsBoxes.map(async box => { return await SellOptionRequest.create(box) }));
        const sellTokenRequestsList = await Promise.all(sellTokenRequestsBoxes.map(async box => { return await SellTokenRequest.create(box) }));
        const buyTokenRequestsList = await Promise.all(buyTokenRequestsBoxes.map(async box => { return await BuyTokenRequest.create(box) }));

        const tokenList = sellOptionsRequests.map(sor => sor.option.optionDef.optionTokenId)
            .concat(sellTokenRequestsList.map(str => str.tokenId))
            .concat(buyTokenRequestsList.map(btr => btr.tokenId))
            .filter((value, index, self) => index === self.findIndex((t) => (
                t === value
            )));;
        const tokenIssuerBoxes = await Promise.all(tokenList.map(async t => await boxByIdv1(t)));
        const tokenInfos = await Promise.all(tokenList.map(async t => await getTokenInfo(t)));

        var tokenRequests = {};
        for (const tokenId of tokenList) {
            tokenRequests[tokenId] = {};
            tokenRequests[tokenId].sellOptionsRequests = sellOptionsRequests.filter(sor => sor.option.optionDef.optionTokenId === tokenId);
            tokenRequests[tokenId].sellTokenRequests = sellTokenRequestsList.filter(str => str.tokenId === tokenId);
            tokenRequests[tokenId].buyTokenRequests = buyTokenRequestsList.filter(btr => btr.tokenId === tokenId);
            tokenRequests[tokenId].tokenInfos = tokenInfos.find(t => t.id === tokenId);
            tokenRequests[tokenId].isOption = tokenIssuerBoxes.findIndex(b => b.boxId === tokenId && b.address === OPTION_SCRIPT_ADDRESS) >= 0;
            if (tokenRequests[tokenId].isOption) {
                tokenRequests[tokenId].optionDef = await OptionDef.create(tokenIssuerBoxes.find(b => b.boxId === tokenId && b.address === OPTION_SCRIPT_ADDRESS));
            }
            const verifiedToken = UNDERLYING_TOKENS.find(t => t.tokenId === tokenId)
            if (verifiedToken) {
                tokenRequests[tokenId].oraclePrice = await getOraclePrice(verifiedToken.oracleNFTID);
            }
        }

        this.setState({
            AMMPrices: AMMPrices,
            sellOptionRequestsList: sellOptionsRequests,
            sellTokenRequestsList: sellTokenRequestsList,
            buyTokenRequestsList: buyTokenRequestsList,
            tokenRequests: tokenRequests,
            walletTokens: walletTokens,
        })

    }

    async componentDidMount() {
        await this.fetchTokenMarket();
    }

    render() {
        return (
            <div className='w-100 d-flex flex-column align-items-center m-2 p-2'>
                <h3>Sigma'O market</h3>
                <div className='w-100 d-flex flex-row justify-content-between'>
                    <div></div>
                    <button className='btn btn-blue'
                        onClick={() => {
                            const url = '/buy-tokens';
                            window.open(url, '_blank').focus();
                        }} >
                        <img src={addIcon} alt="add" width={24} />&nbsp;
                        Buy order
                    </button>
                    <button className='btn btn-blue'
                        onClick={() => {
                            const url = '/sell-tokens';
                            window.open(url, '_blank').focus();
                        }} >
                        <img src={addIcon} alt="add" width={24} />&nbsp;
                        Sell token order
                    </button>
                    <button className='btn btn-blue'
                        onClick={() => {
                            const url = '/sell-options';
                            window.open(url, '_blank').focus();
                        }} >
                        <img src={addIcon} alt="add" width={24} />&nbsp;
                        Sell option order
                    </button>
                    <button className='btn btn-blue'
                        onClick={() => {
                            const url = '/mint-options';
                            window.open(url, '_blank').focus();
                        }} >
                        <img src={addIcon} alt="add" width={24} />&nbsp;
                        Create option
                    </button>
                    <div></div>
                </div>
                <br/>
                <div className='w-100 zonemint m-1 p-1'>
                    {
                        this.state.tokenRequests ?
                            <Table striped hover>
                                <thead>
                                    <tr>
                                        <th>
                                            <div className='d-flex flex-row'>
                                                <div>Token</div>
                                                <HelpToolTip image={helpIcon} id='Token id help' html={
                                                    <div>Token to buy or sell</div>
                                                } />
                                            </div>
                                        </th>
                                        <th>
                                            <div className='d-flex flex-row'>
                                                <div>Price</div>
                                                <HelpToolTip image={helpIcon} id='Price token market help' html={
                                                    <div>Oracle or Spectrum AMM liquidity pool price if any</div>
                                                } />
                                            </div>
                                        </th>
                                        <th>
                                            <div className='d-flex flex-row'>
                                                <div>Buy orders</div>
                                                <HelpToolTip image={helpIcon} id='Buy orders token market help' html={
                                                    <div>Available open buy order</div>
                                                } />
                                            </div>
                                        </th>
                                        <th>
                                            <div className='d-flex flex-row'>
                                                <div>Sell orders</div>
                                                <HelpToolTip image={helpIcon} id='Sell orders token market help' html={
                                                    <div>Available open sell order</div>
                                                } />
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        Object.keys(this.state.tokenRequests).map(tokenId =>
                                            <tr key={tokenId}>
                                                <td>
                                                    {this.state.tokenRequests[tokenId].isOption ?
                                                        <OptionLink optionDef={this.state.tokenRequests[tokenId].optionDef} />
                                                        :
                                                        <TokenLink tokenId={tokenId} name={this.state.tokenRequests[tokenId].tokenInfos?.name} />
                                                    }
                                                </td>
                                                <td>
                                                    {
                                                        this.state.tokenRequests[tokenId].oraclePrice ?
                                                            <div>{formatERGAmount(this.state.tokenRequests[tokenId].oraclePrice)}</div>
                                                            :
                                                            <div>-</div>
                                                    }
                                                </td>
                                                <td>
                                                    <div className='d-flex flex-column'>
                                                        {
                                                            this.state.tokenRequests[tokenId].buyTokenRequests.map(btr => {
                                                                const tokenDecimalFactor = Math.pow(10, this.state.tokenRequests[tokenId].tokenInfos?.decimals);
                                                                console.log("btr", btr)
                                                                return <div className="w-100 d-flex flex-row justify-content-between zonemint m-1 p-1"
                                                                    key={btr.full.boxId}>
                                                                    <TokenPriceAmount
                                                                        tokenPrice={btr.tokenPrice}
                                                                        tokenAmount={btr.tokenAmount}
                                                                        tokenDecimalFactor={tokenDecimalFactor} />
                                                                    <button className='btn btn-blue m-1 p-1'
                                                                        onClick={() => this.sellToken(btr.tokenId, btr.tokenAmount / tokenDecimalFactor, btr.tokenPrice * tokenDecimalFactor)}
                                                                        disabled={this.state.walletTokens.findIndex(t => t.tokenId === tokenId) < 0}>
                                                                        Sell
                                                                    </button>
                                                                </div>
                                                            }
                                                            )
                                                        }
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className='d-flex flex-column'>
                                                        {
                                                            this.state.tokenRequests[tokenId].sellTokenRequests.map(str => {
                                                                const tokenDecimalFactor = Math.pow(10, this.state.tokenRequests[tokenId].tokenInfos?.decimals);
                                                                console.log("str", str)
                                                                return <div className="w-100 d-flex flex-row justify-content-between zonemint m-1 p-1"
                                                                    key={str.full.boxId}>
                                                                    <TokenPriceAmount
                                                                        tokenPrice={str.tokenPrice}
                                                                        tokenAmount={str.tokenAmount}
                                                                        tokenDecimalFactor={tokenDecimalFactor} />
                                                                    <button className='btn btn-blue m-1 p-1'
                                                                        onClick={() => this.buyToken(tokenId, str.tokenAmount / tokenDecimalFactor, str.tokenPrice)}>
                                                                        Buy
                                                                    </button>
                                                                </div>
                                                            }

                                                            )
                                                        }
                                                        {
                                                            this.state.tokenRequests[tokenId].sellOptionsRequests.map(sor => {
                                                                const tokenDecimalFactor = Math.pow(10, this.state.tokenRequests[tokenId].tokenInfos?.decimals);
                                                                console.log("sor", sor)
                                                                return <div className="w-100 d-flex flex-row justify-content-between zonemint m-1 p-1"
                                                                    key={sor.full.boxId}>
                                                                    <TokenPriceAmount
                                                                        tokenPrice={sor.currentOptionPrice / BigInt(tokenDecimalFactor)}
                                                                        tokenAmount={sor.optionAmount}
                                                                        tokenDecimalFactor={tokenDecimalFactor} />
                                                                    <button className='btn btn-blue m-1 p-1'
                                                                        onClick={() => this.buyOption(sor, sor.currentOptionPrice, sor.optionAmount / tokenDecimalFactor)}>
                                                                        Buy
                                                                    </button>
                                                                </div>
                                                            }

                                                            )
                                                        }
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }
                                </tbody>
                            </Table>
                            :
                            <LoadingImage />
                    }
                </div>
            </div>
        )
    }
}
