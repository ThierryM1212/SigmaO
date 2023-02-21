{   //////////////////////////////////////////////////////////
    // OPEN SELL ORDER
    //////////////////////////////////////////////////////////
    // Sell token at fixed price, partial or complete sale
    // token(O) token to Sell
    // R4: Seller PK SigmaProp
    // R5: Token price, nanoERG per smallest unit of token
    // refundable to the SigmaProp set in R4, mandatory for refund to work

    val inputValue: Long = SELF.value
    val inputTokenReserve: (Coll[Byte], Long) = SELF.tokens.getOrElse(0, (Coll[Byte](),0L))
    val userPKIn: SigmaProp = SELF.R4[SigmaProp].get
    
    // anyone can close an empty reserve
    val validCloseEmpty: Boolean = inputTokenReserve._2 == 0L

    // check that the reserve is replicated, tokens delivered and the token price paid to the seller
    val validSellToken: Boolean = if (OUTPUTS(0).propositionBytes == SELF.propositionBytes) {
        val tokenPrice: Long = SELF.R5[Long].get
        val outputReserveTokens: (Coll[Byte], Long) = OUTPUTS(0).tokens.getOrElse(0, (Coll[Byte](),0L))

        val deliveredTokens: Long = if (inputTokenReserve._2 > 0 && outputReserveTokens._2 > 0) { // partial sale
            if (inputTokenReserve._1 == outputReserveTokens._1) {
                inputTokenReserve._2 - outputReserveTokens._2
            } else {
                0L
            }
        } else {
            if (inputTokenReserve._2 > 0 && outputReserveTokens._2 == 0) { // deliver all the tokens
                inputTokenReserve._2
            } else {
                0L
            }
        }

        deliveredTokens > 0L                               && 
        // replicated reserve
        (
            ( // partial sale
                inputTokenReserve._1 == outputReserveTokens._1   &&  
                inputTokenReserve._2 > 0                         && 
                outputReserveTokens._2 > 0    
            ) 
            ||
            ( // deliver all the tokens
                inputTokenReserve._2 > 0                         && 
                outputReserveTokens._2 == 0
            )
        )                                                  && 
        OUTPUTS(0).value == inputValue                     &&
        OUTPUTS(0).R4[SigmaProp].get == userPKIn           &&
        OUTPUTS(0).R5[Long].get == tokenPrice              && 
        // deliver the tokens
        OUTPUTS(1).tokens(0)._1 == inputTokenReserve._1    && 
        OUTPUTS(1).tokens(0)._2 == deliveredTokens         &&
        // pay the seller
        OUTPUTS(2).propositionBytes == userPKIn.propBytes  && 
        OUTPUTS(2).value >= deliveredTokens * tokenPrice
    } else {
        false
    }
    
    userPKIn                  ||  // refund
    sigmaProp(validSellToken  ||
              validCloseEmpty
    )
}
