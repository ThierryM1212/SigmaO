{   //////////////////////////////////////////////////////////
    // OPEN SELL ORDER
    //////////////////////////////////////////////////////////
    // Sell token at fixed price, partial or complete sale
    // token(O) token to Sell
    // R4: Seller PK SigmaProp
    // R5: [ Token price nanoERG per smallest unit of token,
    //       dAppUIFee per thousands,
    //       txFee nanoERG ] Coll[Long]
    // R6: dAppUI ergotree Coll[Byte]
    // refundable to the SigmaProp set in R4, R4 and R5 mandatory for refund to work

    val inputValue: Long = SELF.value
    val inputTokenReserve: (Coll[Byte], Long) = SELF.tokens.getOrElse(0, (Coll[Byte](),0L))
    val userPKIn: SigmaProp = SELF.R4[SigmaProp].get
    val sellParams: Coll[Long] = SELF.R5[Coll[Long]].get
    val txFee: Long = sellParams(2)
    
    // anyone can close an empty reserve
    val validCloseEmpty: Boolean = inputTokenReserve._2 == 0L                        &&
                                   OUTPUTS.size == 2                                 &&
                                   OUTPUTS(0).propositionBytes == userPKIn.propBytes &&
                                   OUTPUTS(1).value == txFee

    // check that the reserve is replicated, tokens delivered, the token price paid to the seller
    // dAppUIFee paid
    val validSellToken: Boolean = if (OUTPUTS(0).propositionBytes == SELF.propositionBytes) {
        val tokenPrice: Long = sellParams(0)
        val dAppUIFeePerThousand: Long = sellParams(1)
        val dAppUIFeeErgoTree: Coll[Byte] = SELF.R6[Coll[Byte]].get
        val outputReserveTokens: (Coll[Byte], Long) = OUTPUTS(0).tokens.getOrElse(0, (Coll[Byte](),0L))

        // Compute how much tokens are delivered
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

        // Compute the minimal price and UI Fee associated
        val minPrice: Long = max(BoxMinValue, deliveredTokens * tokenPrice)
        val dAppUIFee: Long = max(BoxMinValue, dAppUIFeePerThousand * minPrice / 1000L )

        deliveredTokens > 0L                                        &&
        OUTPUTS.size == 5                                           &&
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
        )                                                           && 
        OUTPUTS(0).value == inputValue                              &&
        OUTPUTS(0).R4[SigmaProp].get == userPKIn                    &&
        OUTPUTS(0).R5[Coll[Long]].get == sellParams                 &&
        OUTPUTS(0).R6[Coll[Byte]].get == dAppUIFeeErgoTree          &&
        // deliver the tokens
        // the buyer checks the ownership to himself in the buy contract
        OUTPUTS(1).tokens(0)._1 == inputTokenReserve._1             && 
        OUTPUTS(1).tokens(0)._2 == deliveredTokens                  &&
        // pay the seller
        OUTPUTS(2).propositionBytes == userPKIn.propBytes           && 
        OUTPUTS(2).value >= minPrice                                &&
        // dApp UI Fee
        OUTPUTS(3).propositionBytes == dAppUIFeeErgoTree            &&
        OUTPUTS(3).value >= dAppUIFee                               &&
        // miner fee
        OUTPUTS(4).value == txFee
    } else {
        false
    }
    
    userPKIn                  ||  // refund or whatever
    sigmaProp(validSellToken  ||
              validCloseEmpty
    )
}
