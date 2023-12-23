{   
    // Request to exercise the option
    // Number of option token provided: N (SELF.tokens(0))
    // Exercise Call Value >= MinBoxValue + TxFee + N * ShareSize * StrikePrice
    // Exercise Put Value >= MinBoxValue + TxFee
    // Exercise Put Tokens >= N * ShareSize Underlying tokens
    // R4: SigmaProp: user PK to process a refund
    // R5: Box: Option creation box (boxId = option tokenId)
    // R6: Coll[Byte]: Ergotree to deliver the output of the option exercise (tokens for a call or ERG for a put)
    val userPKIn: SigmaProp = SELF.R4[SigmaProp].get
    val selfToken0: (Coll[Byte], Long) = SELF.tokens.getOrElse(0,(Coll[Byte](),0L))
    val selfToken1: (Coll[Byte], Long) = SELF.tokens.getOrElse(1,(Coll[Byte](),0L))
    val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0,(Coll[Byte](),0L))
    
    // Ensure we get the right amount of Token or ERG in OUTPUTS(1)
    val validExerciseOption = if (OUTPUTS.size == 4 && selfToken0._2 > 0L) {
        val optionCreationBox: Box = SELF.R5[Box].get
        val exerciseOptionErgotree: Coll[Byte] = SELF.R6[Coll[Byte]].get
        val optionTokenId: Coll[Byte] = optionCreationBox.id
        val underlyingAssetTokenId: Coll[Byte] = optionCreationBox.R5[Coll[Byte]].get
        val validCreationBox: Boolean = selfToken0._1 == optionTokenId                                          &&
                                        blake2b256(optionCreationBox.propositionBytes) == OptionScriptHash

        val optionType: Long = optionCreationBox.R8[Coll[Long]].get(0)
        val shareSize: Long = optionCreationBox.R8[Coll[Long]].get(2)
        val strikePrice: Long = optionCreationBox.R8[Coll[Long]].get(4)
        val TxFee: Long = optionCreationBox.R8[Coll[Long]].get(6)
        val numProvidedOption: Long = if (selfToken0._1 == optionTokenId) {
            selfToken0._2
        } else {
            0L
        }

        val validExerciseCommon: Boolean = validCreationBox && OUTPUTS(1).propositionBytes == exerciseOptionErgotree

        val validExcerciseCall: Boolean = if (output1Token0._2 > 0L && optionType == 0L) { 
            OUTPUTS(1).value >= SELF.value - TxFee - BoxMinValue - numProvidedOption * shareSize * strikePrice      &&
            output1Token0._1 == underlyingAssetTokenId                                                              &&
            output1Token0._2 == numProvidedOption * shareSize
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

    (userPKIn && blake2b256(OUTPUTS(0).propositionBytes) != OptionScriptHash) ||  // refund, avoid random exercise from issuer
    sigmaProp(validExerciseOption)
}   
