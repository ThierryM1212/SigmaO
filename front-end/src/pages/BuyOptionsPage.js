import React from 'react';
import { getUnspentBoxesForAddressUpdated, searchUnspentBoxes } from '../ergo-related/explorer';
import { SellOptionRequest } from '../objects/SellOptionRequest';
import { UNDERLYING_TOKENS } from '../utils/script_constants';
import { getAMMPrices } from '../ergo-related/amm';
import { NANOERG_TO_ERG } from '../utils/constants';
import SellOptionList from '../components/SellOptionList';


export default class BuyOptionsPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sellOptionRequestsList: undefined,
            optionTokenId: props.optionTokenId ?? '',
            underlyingTokenId: props.underlyingTokenId ?? '',
        };
        this.fetchSellOptionRequests = this.fetchSellOptionRequests.bind(this);
    }

    async fetchSellOptionRequests() {
        if (this.state.optionTokenId === '' || this.state.underlyingTokenId === '') {
            const sellScriptAddresses = UNDERLYING_TOKENS.map(t => t.sellOptionScriptAddress);
            const sellOptionsRequestsBoxes = (await Promise.all(sellScriptAddresses.map(async addr => getUnspentBoxesForAddressUpdated(addr)))).flat();
            const sellOptionsRequests = await Promise.all(sellOptionsRequestsBoxes.map(async box => { return await SellOptionRequest.create(box) }));
            this.setState({ sellOptionRequestsList: sellOptionsRequests })
        } else {
            const sellScriptAddress = UNDERLYING_TOKENS.find(t => t.tokenId === this.state.underlyingTokenId)?.sellOptionScriptAddress ?? '';
            if (sellScriptAddress !== "") {
                var optionSellRequestsBoxes = await searchUnspentBoxes(sellScriptAddress, [this.state.optionTokenId]);
                optionSellRequestsBoxes = optionSellRequestsBoxes.filter(b => b.assets[0].tokenId === this.state.optionTokenId);
                const optionSellRequests = await Promise.all(optionSellRequestsBoxes.map(async (b) => await SellOptionRequest.create(b)));
                this.setState({ sellOptionRequestsList: optionSellRequests })
            }
        }
    }

    async componentDidMount() {
        this.fetchSellOptionRequests();
    }

    render() {
        //console.log('render BuyOptionsPage', this.state.sellOptionRequestsList, this.state.tokenPrices)
        return (
            <div className='w-100 d-flex flex-column align-items-center'>
                <h5>Options on sale</h5>
                <SellOptionList sellOptionRequestsList={this.state.sellOptionRequestsList}
                     />
            </div>
        )
    }
}
