{   
    // Request to exercise the option
    // Number of option token provided: N
    // Value >= MinBoxValue + TxFee + N * ShareSize * StrikePrice
    val userPKIn: SigmaProp = SELF.R4[SigmaProp].get
    val selfToken0: (Coll[Byte], Long) = SELF.tokens.getOrElse(0,(Coll[Byte](),0L))
    
    // Ensure we get the right amount of Token in output from the option reserve
    val validExerciseOption = if (OUTPUTS.size == 4 && selfToken0._2 > 0L) {
        val optionCreationBox: Box = SELF.R5[Box].get
        val optionTokenID: Coll[Byte] = optionCreationBox.id
        val validCreationBox: Boolean = selfToken0._1 == optionTokenID                                          &&
                                        blake2b256(optionCreationBox.propositionBytes) == OptionCallScriptHash  &&
                                        blake2b256(INPUTS(0).propositionBytes) == OptionCallScriptHash

        val shareSize: Long = optionCreationBox.R8[Coll[Long]].get(1)
        val strikePrice: Long = optionCreationBox.R8[Coll[Long]].get(6)
        val numProvidedOption: Long = if (selfToken0._1 == optionTokenID) {
            selfToken0._2
        } else {
            0L
        }

        if (OUTPUTS(1).tokens.size == 1) {
            validCreationBox                                                                          &&
            blake2b256(OUTPUTS(0).propositionBytes) == OptionCallScriptHash                           &&
            OUTPUTS(1).propositionBytes == userPKIn.propBytes                                         &&
            OUTPUTS(1).value >= SELF.value - TxFee - numProvidedOption * shareSize * strikePrice      &&
            OUTPUTS(1).tokens(0)._1 == underlyingAssetTokenId                                         &&
            OUTPUTS(1).tokens(0)._2 == numProvidedOption * shareSize * underlyingAssetDecimalFactor
        } else {
            false
        }
    } else {
        false
    }

    userPKIn ||  // refund
    sigmaProp(validExerciseOption)
}   
