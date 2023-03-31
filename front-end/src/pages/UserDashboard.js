import React from 'react';
import { getTokensForAddress, searchUnspentBoxes, searchUnspentBoxesUpdated } from '../ergo-related/explorer';
import { SellOptionRequest } from '../objects/SellOptionRequest';
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { getAMMPrices } from '../ergo-related/amm';
import { NANOERG_TO_ERG } from '../utils/constants';
import { getWalletOptions } from '../utils/option_utils';
import OptionList from '../components/OptionList';
import SellOptionList from '../components/SellOptionList';
import { addressToSigmaPropHex } from '../ergo-related/serializer';
import { BuyTokenRequest } from '../objects/BuyTokenRequest';
import BuyTokenList from '../components/BuyTokenList';
import SellTokenList from '../components/SellTokenList';
import { SellTokenRequest } from '../objects/SellTokenRequest';


export default class UserDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            address: localStorage.getItem("address") ?? '',
            walletOptions: undefined,
            walletTokens: [],
            underlyingTokenPrices: [],
            userMintedOptions: [],
            userSellOptions: undefined,
            userSellTokens: undefined,
            userBuyTokens: undefined,
        };
        this.fetchUserSellOptionRequests = this.fetchUserSellOptionRequests.bind(this);
    }

    async fetchUserSellOptionRequests() {
        const addressSigmaPropHex = await addressToSigmaPropHex(this.state.address);
        const sellScriptAddresses = UNDERLYING_TOKENS.map(t => t.sellOptionScriptAddress);
        const sellOptionsRequestsBoxes = (await Promise.all(
            sellScriptAddresses.map(async addr => searchUnspentBoxes(addr, [], { R4: addressSigmaPropHex.slice(4) })))
        ).flat()
            .filter((value, index, self) => index === self.findIndex((t) => (
                t.boxId === value.boxId
            )));
        const sellOptionsRequests = await Promise.all(
            sellOptionsRequestsBoxes.map(async box => { return await SellOptionRequest.create(box) })
        );
        console.log("sellOptionsRequests", sellOptionsRequests);
        this.setState({ userSellOptions: sellOptionsRequests })
    }

    async fetchUserBuyTokenRequests() {
        const addressSigmaPropHex = await addressToSigmaPropHex(this.state.address);
        const buyTokenBoxes = await searchUnspentBoxesUpdated(BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, [], { R4: addressSigmaPropHex.slice(4) });
        const buyTokenRequests = await Promise.all(
            buyTokenBoxes.map(async box => { return await BuyTokenRequest.create(box) })
        );
        console.log("buyTokenRequests", buyTokenRequests);
        this.setState({ userBuyTokens: buyTokenRequests })
    }

    async fetchUserSellTokenRequests() {
        const addressSigmaPropHex = await addressToSigmaPropHex(this.state.address);
        const sellTokenBoxes = await searchUnspentBoxesUpdated(SELL_FIXED_SCRIPT_ADDRESS, [], { R4: addressSigmaPropHex.slice(4) });
        const sellTokenRequests = await Promise.all(
            sellTokenBoxes.map(async box => { return await SellTokenRequest.create(box) })
        );
        console.log("sellTokenRequests", sellTokenRequests);
        this.setState({ userSellTokens: sellTokenRequests })
    }

    async componentDidMount() {

        if (this.state.address !== '') {
            const AMMPrices = await getAMMPrices();
            var underlyingTokenPrices = UNDERLYING_TOKENS.map(t => {
                return { tokenId: t.tokenId, price: Math.round(NANOERG_TO_ERG / AMMPrices.find(at => t.tokenId === at.tokenId)?.price) }
            });
            const walletTokens = await getTokensForAddress(this.state.address);
            const walletOptions = await getWalletOptions(this.state.address);
            this.setState({
                walletTokens: walletTokens,
                walletOptions: walletOptions,
                underlyingTokenPrices: underlyingTokenPrices
            });
            this.fetchUserSellOptionRequests();
            this.fetchUserBuyTokenRequests();
            this.fetchUserSellTokenRequests();
        }
    }

    render() {
        console.log("render UserDashboard", this.state)
        return (
            <div className='w-100 d-flex flex-column align-items-center'>
                {
                    this.state.address === "" ?
                        <h4>ERG address not set</h4>
                        :
                        <div className='w-100 d-flex flex-column align-items-center m-2 p-2'>
                            <div className='d-flex flex-column m-1 p-1 align-items-center'>
                                <h4>Options in my wallet</h4>
                                <OptionList optionList={this.state.walletOptions}
                                    walletTokens={this.state.walletTokens}
                                    underlyingTokenPrices={this.state.underlyingTokenPrices} />
                            </div>
                            <div className='d-flex flex-column m-1 p-1 align-items-center'>
                                <h4>My options on sale</h4>
                                <SellOptionList sellOptionRequestsList={this.state.userSellOptions} />
                            </div>
                            <div className='d-flex flex-column m-1 p-1 align-items-center'>
                                <h4>My tokens on sale</h4>
                                <SellTokenList sellTokenRequestsList={this.state.userSellTokens} />
                            </div>
                            <div className='d-flex flex-column m-1 p-1 align-items-center'>
                                <h4>My buy requests</h4>
                                <BuyTokenList buyTokenRequestsList={this.state.userBuyTokens} />
                            </div>
                        </div>
                }
            </div>
        )
    }
}
