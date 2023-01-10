{   
    // 
    val userPKIn = SELF.R4[SigmaProp].get
    val optionTokenID = SELF.R5[Coll[Byte]].get
    val optionAmountRequested = SELF.R6[Long].get 
    val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0, (Coll[Byte](),0L))
    
    // ensure we get the minimal amount of option requested in OUTPUTS(1)
    val validBuyOption = if (OUTPUTS(1).tokens.size == 1) {
        OUTPUTS(1).propositionBytes == userPKIn.propBytes  &&
        output1Token0._1 == optionTokenID                  &&
        output1Token0._2 >= optionAmountRequested
    } else {
        false
    }
    
    userPKIn ||  // refund
    sigmaProp(validBuyOption)
}
