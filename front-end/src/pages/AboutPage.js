import AddressLink from "../components/AddressLink";
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants";

function HomePage(props) {
    return (
        <div className="w-100 d-flex flex-column align-items-center">
            <h2>Sigma'O</h2>
            <h3>Options on Ergo tokens</h3>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Create option tokens granting to their owner to buy or sell an underlying token at a given strike price</h5>
                <h6>Sigma'O option can be of types:</h6>
                <h6>  - Call: grant to buy a token at a fixed strike price</h6>
                <h6>  - Put: grant to sell a token at a fixed strike price</h6>
                <h6>Sigma'O option can be of style:</h6>
                <h6>  - American: Exercible up to the maturity date</h6>
                <h6>  - European: Exercible during 24h after the maturity date</h6>
                <h6>Sigma'O option are standard EIP-4 tokens they can be traded on the Auction House or TokenJay.</h6>
                <h6>Compound options (options on options are supported) allowing users to create Call on Call, Call on Put, Put on Call or Put on Put options.</h6>
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Medium article about Sigma'O</h5>
                <a href="https://medium.com/@Haileypdll/sigmao-options-on-ergo-tokens-18adaa098416" target="_blank" rel="noreferrer">Medium - Sigma’O — Options on Ergo tokens</a>
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Trade option tokens using SigmaO priced smart contract</h5>
                <h6>Sigma'O provides an option sell contract that price the option emulating the Black-Scholes formula.</h6>
                <h6>The option priced sell contract is configurable by the seller to adjust the pricing behavior to its need.</h6>
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Trade any Ergo EIP-4 tokens (including SigmaO options) using Open sell order and Open buy order smart contracts.</h5>
                <h6>Open buy order and sell order contracts allow user to create a buy or a sell request at a fixed price.</h6>
                <h6>Any user or contract can fullfill the buy or sell requirements by delivering the right amount of ERG or tokens to the issuer.</h6>
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Information on options</h5>
                <a href="https://www.investopedia.com/terms/o/option.asp" target="_blank" rel="noreferrer">Investopedia - What Is an Option?</a>
                <a href="https://en.wikipedia.org/wiki/Option_(finance)" target="_blank" rel="noreferrer">Wikipedia - Option (Finance)</a>
                <a href="https://www.investopedia.com/terms/c/compoundoption.asp" target="_blank" rel="noreferrer">Investopedia - Compound option</a>
                <a href="https://www.codearmo.com/python-tutorial/options-trading-options-pricing-introduction" target="_blank" rel="noreferrer">CodeArmor - Option pricing introduction</a>
                <a href="http://www.espenhaug.com/black_scholes.html" target="_blank" rel="noreferrer">Black-Scholes implementations</a>
                <a href="https://www.amazon.com/Options-Futures-Other-Derivatives-Global/dp/1292410655/" target="_blank" rel="noreferrer">Options Futures and Other derivatives by John Hull</a>
                <a href="https://www.amazon.com/Intelligent-Option-Investor-Applying-Investing/dp/007183365X" target="_blank" rel="noreferrer">Intelligent Option Investor by Erik Kobayashi-Solomon</a>
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>SigmaO contracts</h5>
                <div className="w-100 d-flex flex-row justify-content-between">
                    <div>Option</div>
                    <AddressLink address={OPTION_SCRIPT_ADDRESS} length={20} />
                </div>
                <div className="w-100 d-flex flex-row justify-content-between">
                    <div>Exercise Option Request</div>
                    <AddressLink address={EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS} length={20} />
                </div>
                <div className="w-100 d-flex flex-row justify-content-between">
                    <div>Open buy order</div>
                    <AddressLink address={BUY_TOKEN_REQUEST_SCRIPT_ADDRESS} length={20} />
                </div>
                <div className="w-100 d-flex flex-row justify-content-between">
                    <div>Open sell order</div>
                    <AddressLink address={SELL_FIXED_SCRIPT_ADDRESS} length={20} />
                </div>
                {
                    UNDERLYING_TOKENS.map(t =>
                        <div className="w-100 d-flex flex-row justify-content-between" key={t.tokenId}>
                            <div>Sell option {t.label}</div>
                            <AddressLink address={t.sellOptionScriptAddress} length={20} />
                        </div>
                    )
                }
            </div>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Know your assumptions.</h5>
                <h6>SigmaO is an open source application interacting with smart contracts on the Ergo blockchain.</h6>
                <h6>The application does not log or collect the user data.</h6>
                <h6>The transaction are done live on the Ergo blockchain and are not reversible, they can be followed on&nbsp;
                    <a href="https://explorer.ergoplatform.com/" target="_blank" rel="noreferrer">https://explorer.ergoplatform.com/</a>.</h6>
                <h6>SigmaO is open source and can be reviewed at:&nbsp;
                    <a href="https://github.com/ThierryM1212/sigmao" target="_blank" rel="noreferrer">https://github.com/ThierryM1212/sigmao</a>.</h6>
                <h6>The application is in beta version, done in the context of Ergohack VI, it is recommended to use it for only small transactions.</h6>
                <h6>The application is permissionless, the developper don't have more grants than you to interact with the smart contracts.</h6>

            </div>

        </div>
    );
}
export default HomePage;
