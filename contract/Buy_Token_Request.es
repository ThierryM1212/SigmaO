{   //////////////////////////////////////////////////////////
    // OPEN BUY ORDER
    //////////////////////////////////////////////////////////
    // Focus on getting paid the right amount of token in the OUTPUTS(1) of the transaction
    // ERG value: amount available for the purchase
    // R4: SigmaProp: Buyer P2PK SigmaProp, to be able to be paid or to refund the buy request
    // R5: Coll[Byte]: TokenId to be bought
    // R6: Long: Raw amount of token to be delivered, for example 100 for 1 SigUSD that has 2 decimals

    // Refund possible only if P2PK set
    val userPKIn = SELF.R4[SigmaProp].get
    
    // ensure we get the minimal amount of token requested in OUTPUTS(1)
    val validBuyToken = if (OUTPUTS(1).tokens.size == 1) {
        val tokenTokenId = SELF.R5[Coll[Byte]].get
        val tokenAmountRequested = SELF.R6[Long].get 
        val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0, (Coll[Byte](),0L))

        OUTPUTS(1).propositionBytes == userPKIn.propBytes  &&
        output1Token0._1 == tokenTokenId                  &&
        output1Token0._2 >= tokenAmountRequested
    } else {
        false
    }
    
    userPKIn ||  // refund
    sigmaProp(validBuyToken)
}
