{   
    // 
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
