
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
