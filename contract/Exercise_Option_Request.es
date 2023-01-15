{   
    // Request to exercise the option
    // Number of option token provided: N
    // Exercise Call Value >= MinBoxValue + TxFee + N * ShareSize * StrikePrice
    // Exercise Put Value >= MinBoxValue + TxFee
    // Exercise Put Tokens >= N * ShareSize Underlying tokens
    val userPKIn: SigmaProp = SELF.R4[SigmaProp].get
    val selfToken0: (Coll[Byte], Long) = SELF.tokens.getOrElse(0,(Coll[Byte](),0L))
    val selfToken1: (Coll[Byte], Long) = SELF.tokens.getOrElse(1,(Coll[Byte](),0L))
    val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0,(Coll[Byte](),0L))
    
    // Ensure we get the right amount of Token or ERG in OUTPUTS(1) from the option reserve
    val validExerciseOption = if (OUTPUTS.size == 4 && selfToken0._2 > 0L) {
        val optionCreationBox: Box = SELF.R5[Box].get
        val optionTokenID: Coll[Byte] = optionCreationBox.id
        val validCreationBox: Boolean = selfToken0._1 == optionTokenID                                          &&
                                        blake2b256(optionCreationBox.propositionBytes) == OptionCallScriptHash  &&
                                        blake2b256(INPUTS(0).propositionBytes) == OptionCallScriptHash

        val optionType: Long = optionCreationBox.R8[Coll[Long]].get(0)
        val shareSize: Long = optionCreationBox.R8[Coll[Long]].get(2)
        val strikePrice: Long = optionCreationBox.R8[Coll[Long]].get(7)
        val numProvidedOption: Long = if (selfToken0._1 == optionTokenID) {
            selfToken0._2
        } else {
            0L
        }

        val validExerciseCommon: Boolean = 
            validCreationBox                                                                          &&
            blake2b256(OUTPUTS(0).propositionBytes) == OptionCallScriptHash                           &&
            OUTPUTS(1).propositionBytes == userPKIn.propBytes

        val validExcerciseCall: Boolean = if (output1Token0._2 > 0L && optionType == 0L) { 
            OUTPUTS(1).value >= SELF.value - TxFee - numProvidedOption * shareSize * strikePrice      &&
            output1Token0._1 == underlyingAssetTokenId                                                &&
            output1Token0._2 == numProvidedOption * shareSize * underlyingAssetDecimalFactor
        } else {
            false
        }

        val validExcercisePut: Boolean = if (output1Token0._2 == 0L && optionType == 1L) {
            OUTPUTS(1).value >= numProvidedOption * shareSize * strikePrice
        } else {
            false
        }

        validExerciseCommon && ( validExcerciseCall || validExcercisePut )
        
    } else {
        false
    }

    userPKIn ||  // refund
    sigmaProp(validExerciseOption)
}   
