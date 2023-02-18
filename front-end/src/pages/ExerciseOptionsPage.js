import React from 'react';
import { getTokensForAddress, getUnspentBoxesForAddressUpdated, searchUnspentBoxesUpdated } from '../ergo-related/explorer';
import { OPTION_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from '../utils/script_constants';
import { Option } from '../objects/Option';
import OptionCard from '../components/OptionCard';
import { getAMMPrices } from '../ergo-related/amm';
import { NANOERG_TO_ERG } from '../utils/constants';
import OptionList from '../components/OptionList';


export default class ExerciseOptionsPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            maxDisplayedOptions: 20,
            tokenIdFilter: '',
            optionTokenIdFilter: '',
            optionList: undefined,
            AMMPrices: [],
            walletTokens: [],
        };
        this.fetchOptions = this.fetchOptions.bind(this);
        this.setUnderlyingTokenId = this.setUnderlyingTokenId.bind(this);
        this.setMaxDisplayedOptions = this.setMaxDisplayedOptions.bind(this);
    }

    setUnderlyingTokenId = (tokenId) => { this.setState({ tokenIdFilter: tokenId, }); };
    setMaxDisplayedOptions = (s) => { this.setState({ maxDisplayedOptions: s.replace(/[^0-9]/g, "") }); };

    async fetchOptions() {
        var allOptionJSON = {};
        if (this.state.tokenIdFilter === '') {
            allOptionJSON = await getUnspentBoxesForAddressUpdated(OPTION_SCRIPT_ADDRESS, this.state.maxDisplayedOptions);
        } else {
            allOptionJSON = await searchUnspentBoxesUpdated(OPTION_SCRIPT_ADDRESS, [], { "R5": this.state.tokenIdFilter }, this.state.maxDisplayedOptions);
        }
        const allOptions2 = await Promise.all(allOptionJSON.map(async opt => {
            const option = await Option.create(opt);
            return option;
        }))
        console.log("allOptions2", allOptions2)
        this.setState({ optionList: allOptions2 })
    }

    async componentDidMount() {
        const AMMPrices = await getAMMPrices();
        this.setState({ AMMPrices: AMMPrices })
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const walletTokens = await getTokensForAddress(address);
            this.setState({ walletTokens: walletTokens })
        }
        await this.fetchOptions();
    }

    render() {
        const underlyingTokenPrices = UNDERLYING_TOKENS.map(t => {
            return { tokenId: t.tokenId, price: Math.round(NANOERG_TO_ERG / this.state.AMMPrices.find(at => t.tokenId === at.tokenId)?.price) }
        })
        console.log("underlyingTokenPrices", underlyingTokenPrices)
        return (
            <div className='w-100 d-flex flex-column align-items-center'>
                <div className='w-75 d-flex flex-column m-2 p-2 zonemint'>
                    <div className='d-flex flex-row justify-content-start align-items-center p-2'>
                        <label htmlFor="underlyingToken" className='col-sm d-flex align-items-start'>Underlying token</label>
                        <input type="text"
                            id="underlyingToken"
                            className="form-control col-sm input-dark"
                            onChange={e => this.setUnderlyingTokenId(e.target.value)}
                            value={this.state.tokenIdFilter}
                            autoComplete="off"
                        />
                    </div>
                    <div className='d-flex flex-row justify-content-start align-items-center p-2'>
                        <label htmlFor="maxDisplayedOptions" className='col-sm d-flex align-items-start'>Display max</label>
                        <input type="text"
                            id="maxDisplayedOptions"
                            className="form-control col-sm input-dark"
                            onChange={e => this.setMaxDisplayedOptions(e.target.value)}
                            value={this.state.maxDisplayedOptions}
                            autoComplete="off"
                        />

                    </div>
                    <div className='m-1'>
                        <button className='btn btn-blue' onClick={() => this.fetchOptions()} >
                            Search
                        </button>
                    </div>
                </div>
                <OptionList optionList={this.state.optionList}
                    walletTokens={this.state.walletTokens}
                    underlyingTokenPrices={underlyingTokenPrices} />

            </div>
        )
    }
}
