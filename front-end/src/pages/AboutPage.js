import AddressLink from "../components/AddressLink";
import { BUY_TOKEN_REQUEST_SCRIPT_ADDRESS, EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS, OPTION_SCRIPT_ADDRESS, SELL_FIXED_SCRIPT_ADDRESS, UNDERLYING_TOKENS } from "../utils/script_constants";
import MintCallOptionDiagram from "../images/diagrams/mint_options_simple2.png";
import MintPutOptionDiagram from "../images/diagrams/mint_options_put_simple2.png";
import SellPricedOptionDiagram from "../images/diagrams/Sell_priced_option2.png";
import ExerciseCallOptionDiagram from "../images/diagrams/exercise_call_option_simple2.png";
import ExercisePutOptionDiagram from "../images/diagrams/exercise_put_option_simple2.png";


function HomePage(props) {
    return (
        <div className="w-100 d-flex flex-column align-items-center">
            <h2>Sigma'O</h2>
            <h3>Options on Ergo tokens</h3>
            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Create option tokens granting to their owner to buy or sell an underlying token at a given strike price</h5>
                <h5>SigmaO options are standard EIP-4 tokens, sent to your ERG wallet once created. The option grant is provided by the tokens themselves.</h5>
                <h6>Sigma'O option can be of types:</h6>
                <h6>  - Call: grant to buy a token at a fixed strike price</h6>
                <h6>  - Put: grant to sell a token at a fixed strike price</h6>
                <h6>Sigma'O option can be of style:</h6>
                <h6>  - American: Exercible up to the maturity date</h6>
                <h6>  - European: Exercible during 24h after the maturity date</h6>
                <h6>Sigma'O option tokens can be also traded on the Auction House or TokenJay.</h6>
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
                <h5>Use case: Bob creates <u><b>Call</b></u> options on Ergopad tokens</h5>
                <h6>Bob sends 1000 ergopad token to the SigmaO option contract and the option parameters.</h6>
                <h6>The option tokens are then minted and sent to Bob, they are standard EIP-4 token and go to the Bob's wallet.</h6>
                <h6>The ergopad tokens are locked in a "reserve" to allow to option token holder to exercise the option.</h6>
                <h6>Bob can now tries to sell its option tokens.</h6>
                <h6>When the price of the ergopad is <u><b>over</b></u> the strike price of the option, the option tokens have an intrinsic value because they allow to <u><b>buy</b></u> ergopad cheaper than the real price.</h6>
                <img className="w-100" src={MintCallOptionDiagram} alt="simple mint call option" />
            </div>

            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Use case: Bob creates <u><b>Put</b></u> options on Ergopad tokens</h5>
                <h6>Bob sends 5 ERG to the SigmaO option contract and the option parameters.</h6>
                <h6>The option tokens are then minted and sent to Bob, they are standard EIP-4 token and go to the Bob's wallet.</h6>
                <h6>The ERG are locked in a "reserve" to allow to option token holder to exercise the option.</h6>
                <h6>Bob can now tries to sell its option tokens.</h6>
                <h6>When the price of the ergopad is <u><b>below</b></u> the strike price of the option, the option tokens have an intrinsic value because they allow to <u><b>sell</b></u> ergopad higher than the real price.</h6>
                <img className="w-100" src={MintPutOptionDiagram} alt="simple mint put option" />
            </div>

            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Use case: Bob sells 3 call options on Ergopad to Alice</h5>
                <h6>Bob creates an "Option priced sell order".</h6>
                <h6>The price of the option will change in real time depending on the price of the Ergopad tokens in the Spectrum AMM liquidity pool.</h6>
                <h6>Alice creates a buy order at the current price and receive the options.</h6>
                <h6>Bob get the payment from Alice in ERG.</h6>
                <h6>The pricing formula garantee to Bob to sell the options over their intrisic price at any time. The formula emulates Black-Scholes pricing and can be configured.</h6>
                <h6>Note 1: The pricing is done in the Sell contract and cannot be modified once the Sell order is created. Just SigmaO UI "just" does the same computation to match the contract requirements.</h6>
                <h6>Note 2: Both Sell and Buy orders are refundable at any time to the issuer.</h6>
                <img className="w-100" src={SellPricedOptionDiagram} alt="sell priced option diagram" />
            </div>

            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Use case: Alice exercises 2 <u><b>Call options</b></u> on Ergopad</h5>
                <h6>Alice wants to exercise the 2 Call options and <u><b>buy</b></u> the Ergopad they grant.</h6>
                <h6>Alice creates an "Exercise option request" providing the option tokens and the required amount of ERG to match the strike price.</h6>
                <h6>The Ergopad tokens are delivered to Alice from the option reserve that was created at the same time than the options.</h6>
                <h6>Bob, the option issuer, get paid for the Ergopad sold to Alice through the options with ERGs.</h6>
                <h6>Alice was able to buy the Ergopad at the given strike price, whatever the current Ergopad price is.</h6>
                <h6>Bob was able to sell the options and then the ergopad at the price he had defined.</h6>
                <img className="w-100" src={ExerciseCallOptionDiagram} alt="exercise call option diagram" />
            </div>


            <div className="w-75 zonemint m-2 p-2 d-flex flex-column align-items-start">
                <h5>Use case: Alice exercises 2 <u><b>Put options</b></u> on Ergopad</h5>
                <h6>Alice wants to exercise 2 Put options and <u><b>sell</b></u> the Ergopad they grant.</h6>
                <h6>The ERGs are delivered to Alice from the option reserve that was created at the same time than the options.</h6>
                <h6>Bob, the option issuer, buy the Ergopad at the defined strike price.</h6>
                <img className="w-100" src={ExercisePutOptionDiagram} alt="exercise put option diagram" />
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
