{   
    //////////////////////////////////////////////////////////
    // SigmaO OPTION PEERBOX CONTRACT
    //////////////////////////////////////////////////////////
    // Required to mint the option tokens and provide the ergotrees matching the declared ergotree hashes in the option box
    // Those contracts are used for the options delivery, exercise and close transactions
    // Option peerbox: 
    //   Erg Value : 0.002
    //   Tokens: -
    //   R4 Coll[Byte]: Option name for information purpose
    //   R5 Coll[Byte]: Underlying token ID
    //   R6 Coll[Byte]: Underlying token decimals encoded as a string, for better display of the option amount in the wallet, not used
    //   R7 Coll[Long]: [
    //                    - Option nanoerg amount (value of the option box)
    //                    - Option underlying token amount (number of underlying tokens for a call option, 0 for a put)
    //                  ]
    //   R8 Coll[Long]: [
    //                    - Option Type (0 Call, 1 Put)
    //                    - Option Style (0 European, 1 American)
    //                    - Share size (number of smaller unit of token per smaller unit of option)
    //                    - Maturity Date (unix time milleseconds)
    //                    - Strike price (nanoerg per smallest unit of token)
    //                    - dApp Mint Fee (nanoerg) (mint fee freely computed by the UI)
    //                    - miner transaction fee (nanoerg)
    //                  ]
    //   R9 Coll[Coll[Byte]]: [
    //                    - Issuer EC point
    //                    - dAppUIErgoTree
    //                    - Option delivery Ergotree
    //                    - Option exercise Ergotree
    //                    - Option close Ergotree
    //                    - Option ergotree hash
    //                  ]

    val SELF_optionName: Coll[Byte] = SELF.R4[Coll[Byte]].get
    val SELF_underlyingAssetTokenId: Coll[Byte] = SELF.R5[Coll[Byte]].get
    val SELF_optionDecimals: Coll[Byte] = SELF.R6[Coll[Byte]].get
    val SELF_optionERGAmount: Long = SELF.R7[Coll[Long]].get(0)
    val SELF_optionUnderlyingTokenAmount: Long = SELF.R7[Coll[Long]].get(1)
    val SELF_optionParams: Coll[Long] = SELF.R8[Coll[Long]].get
    val SELF_issuerECPoint: Coll[Byte] = SELF.R9[Coll[Coll[Byte]]].get(0)
    // The option contract handles the check of the ergotrees matching the hashes in the option
    val SELF_optionScriptHash: Coll[Byte] = SELF.R9[Coll[Coll[Byte]]].get(5)

    // Output 0 matches the option script
    val validOutput0Option: Boolean = SELF_optionScriptHash == blake2b256(OUTPUTS(0).propositionBytes)

    // Spendable if the matching option box is also spent in INPUTS(0)
    val validMintOption: Boolean = if (INPUTS.size == 2 && OUTPUTS.size == 3  &&
                                  blake2b256(INPUTS(0).propositionBytes) == SELF_optionScriptHash) {
        val optionCreationBox: Box = INPUTS(0)
        val OPTION_optionName: Coll[Byte] = optionCreationBox.R4[Coll[Byte]].get
        val OPTION_underlyingAssetTokenId: Coll[Byte] = optionCreationBox.R5[Coll[Byte]].get
        val OPTION_optionDecimals: Coll[Byte] = optionCreationBox.R6[Coll[Byte]].get
        val OPTION_optionParams: Coll[Long] = optionCreationBox.R8[Coll[Long]].get
        val OPTION_issuerECPoint: Coll[Byte] = optionCreationBox.R9[Coll[Coll[Byte]]].get(0)
        val OPTION_underlyingTokenAmount: Long = optionCreationBox.tokens.map({ 
                                                            (t: (Coll[Byte], Long)) => if (t._1 == SELF_underlyingAssetTokenId) t._2 else 0L
                                                    }).fold(0L, { (acc: Long, curr: Long) => acc + curr })

        // Valid the option parameters
        validOutput0Option                                               &&
        SELF_optionName             == OPTION_optionName                 &&
        SELF_underlyingAssetTokenId == OPTION_underlyingAssetTokenId     &&
        SELF_optionDecimals         == OPTION_optionDecimals             &&
        SELF_optionParams           == OPTION_optionParams               &&
        SELF_issuerECPoint          == OPTION_issuerECPoint              &&
        // The option checks the ergotree are matching the hashes
        // Check the amount of ERG in the option box for the reserve
        SELF_optionERGAmount == optionCreationBox.value                  &&
        // Check the amount of underlying tokens in the option box (CALL option) for the reserve
        SELF_optionUnderlyingTokenAmount == OPTION_underlyingTokenAmount
    } else {
        false
    }

    (
        (
            // refund the issuer
            proveDlog(decodePoint(SELF_issuerECPoint))  && // issuer signing
            sigmaProp(!validOutput0Option)                 // prevent option minting in case of refund
        )            
        ||
        (  // mint the options tokens
            sigmaProp(validMintOption)
        )
    )
}
