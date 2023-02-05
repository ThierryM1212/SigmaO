# Sigma'O

- The goal of the project is to provide a smart contract allowing to issue tokens behaving like an option.
- The option type can be CALL or PUT with European or American style.
- The contract is permission less and fully hedged
- A configurable fee for the UI provider is available

![Sigma'O global diagram](./contract/OptionCall_global.drawio.png)

## Option Contract
### Option Emission parameters
    - Style: European (exercible during 24h after expiration) or American (exercible up to expiration)
    - Underlying token (for example SigUSD)
    - Option amount: number of option created
    - Share size: number of token per option
    - Strike price: underlying token strike price (nanoerg per token)
    - Maturity date: expiration date of the option, minimum 24h maximum 3 years

### Mint option token
    - The option emission smart contrat allows to create tokens that behaves like an option as they grant to exercise the option from the token stored in the the reserve by the issuer.
    - Once sold, the tokens are freely tradeable on a secondary market
    - An option sell contract following the same formula with a discount could be implemented.
    - The tokens stored in the reserve are not available for the issuer until the option expiration and the end of the execise period.

### Option contract hardcoded parameters
    - Min duration: 24h
    - Max duration: 3 years
    - Frozen period (cannot be sold anymore): 4h before expiration
    - European exercise period: 24h


## Sell option contract
The underlying token needs an Oracle that provides the current price of the token in nanoERG.
### Option call pricing
The option price at the money (ATM) is computed with the Black-Scholes approximation formula:
http://www.espenhaug.com/black_scholes.html

    - Strike price: Sp (nanoErg per SigUSD)
    - Share Size: Ss (SigUSD per option)
    - Maturity date: D (milliseconds)
    - Remaining time: T (year)
    - Underlying price: P (nanoErg per SigUSD)
    - σ : volatility
    - K1: price spead factor 
    - K2: american factor

    Option price = intrinsic price + time value
    Call intrinsic price = max(0, (P - Sp) * Ss)
    Put intrinsic price = max(0, (Sp - P) * Ss)
    European option time value = 0.4 * σ * Ss * Sp * SQRT(T) * (1 - K1 * ABS(P - Sp) / Sp)
    American option time value = European option time value * (1 + K2 * SQRT(T))

### Option price behavior
    - At the money Call price = Put Price all parameters equals
    - The time value is maximal at the money and decrease when the underlying price spread from the strike price
    - American option have a price > to the European option with same parameter
    - Max call price = underlying asset price
    - Max put price = strike price
    - Min option price: 0.001 ERG (1000000 nanoergs)


