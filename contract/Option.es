{   
    // Option Call contract ERG / underlying token 
    // needs an Oracle like SigUSD, with a tokenId Oracle box identifier and price in nanoerg per token in the R4

    val valueIn: Long = SELF.value
    val optionName: Coll[Byte] = SELF.R4[Coll[Byte]].get
    val selfToken0: (Coll[Byte], Long) = SELF.tokens.getOrElse(0, (Coll[Byte](),0L))
    val selfToken1: (Coll[Byte], Long) = SELF.tokens.getOrElse(1, (Coll[Byte](),0L))
    val output0Token0: (Coll[Byte], Long) = OUTPUTS(0).tokens.getOrElse(0, (Coll[Byte](),0L))
    val output0Token1: (Coll[Byte], Long) = OUTPUTS(0).tokens.getOrElse(1, (Coll[Byte](),0L))
    val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0, (Coll[Byte](),0L))
    val str0: Coll[Byte] = fromBase64("MA==")
    
    val isMinted: Boolean = selfToken0._1 == SELF.R7[Box].get.id                           && 
                            SELF.propositionBytes == SELF.R7[Box].get.propositionBytes

    // if the token is not minted yet take the configuration from self, else from the mint box in the register R7
    val optionCreationBox: Box = if (isMinted) {
        SELF.R7[Box].get
    } else {
        SELF
    }

    val isCall: Boolean = optionCreationBox.R8[Coll[Long]].get(0) == 0L // 0 Call, 1 Put
    val isEuropean: Boolean = optionCreationBox.R8[Coll[Long]].get(1) == 0L // 0 european, 1 american
    val shareSize: Long = optionCreationBox.R8[Coll[Long]].get(2) // Number of underlying token granted per option, 1 for 1 SigUSD per option
    val shareSizeAdjusted: Long = shareSize * underlyingAssetDecimalFactor // Number of tokens per option, with decimals
    val maturityDate: Long = optionCreationBox.R8[Coll[Long]].get(3) // Unix time
    val sigmaVol: Long = optionCreationBox.R8[Coll[Long]].get(4) // volatility, per 1000
    val K1: Long = optionCreationBox.R8[Coll[Long]].get(5) // K spread, per 1000
    val K2: Long = optionCreationBox.R8[Coll[Long]].get(6) // K american, per 1000
    val strikePrice: Long = optionCreationBox.R8[Coll[Long]].get(7) // nanoerg per token
    val dAppUIFeePerThousand: Long = optionCreationBox.R8[Coll[Long]].get(8) // per 1000
    val dAppUIMintFee: Long = optionCreationBox.R8[Coll[Long]].get(9) // nanoerg

    val issuerPK: SigmaProp = optionCreationBox.R9[SigmaProp].get
    val dAppUIFeeErgoTree: Coll[Byte] = optionCreationBox.R5[Coll[Byte]].get
    val optionTokenIDIn: Coll[Byte] = optionCreationBox.id

    val FreezeDelay: Long = 4 * HourInMilli
    val MinOptionDuration: Long = 24 * HourInMilli
    val MinOptionReserveValue: Long = TxFee + BoxMinValue
    val currentTimestamp: Long = CONTEXT.preHeader.timestamp
    val remainingDuration: Long = maturityDate - currentTimestamp
    val isExpired: Boolean = currentTimestamp > maturityDate
    val isFrozen: Boolean = !isExpired && currentTimestamp > (maturityDate - FreezeDelay)
    val isExercible: Boolean = if (isEuropean) { // European
        // exercible during 24h after expiration
        isMinted && isExpired && currentTimestamp < maturityDate + 24 * HourInMilli
    } else { // American
        // exercible until expiration
        isMinted && !isExpired
    }
    val isEmpty: Boolean = valueIn == MinOptionReserveValue    && 
                           selfToken0._2 == 1L                 && // 1 option to stay in the box
                           selfToken1._2 <= 1L                    // Call 1 token to stay, Put 0 token

    val validOptionValue: Boolean =  OUTPUTS(0).value >= MinOptionReserveValue

    val validBasicReplicatedOutput0: Boolean = if (OUTPUTS(0).propositionBytes == SELF.propositionBytes) {
        output0Token0._1 == optionTokenIDIn                        &&
        output0Token0._2 >= 1L                                     && // 1 to stay in the box
        validOptionValue                                           &&
        (
            (   // Call
                isCall                                        && 
                output0Token1._1 == underlyingAssetTokenId    &&
                output0Token1._2 >= 1L // 1 to stay in the box
            ) || 
            (   // Put
                !isCall
            )
        )                                                          &&
        OUTPUTS(0).R4[Coll[Byte]].get == optionName                &&
        OUTPUTS(0).R5[Coll[Byte]].get == str0                      && // String 0 utf-8 encoded, fixed description
        OUTPUTS(0).R6[Coll[Byte]].get == str0                      && // String 0 utf-8 encoded, no decimals for the options
        OUTPUTS(0).R7[Box].get == optionCreationBox
    } else {
        false
    }

    val validMintOption: Boolean = if (!isMinted && INPUTS.size == 1 && remainingDuration >= MinOptionDuration) {
        val validMintedOption: Boolean = 
            validOptionValue                                &&
            OUTPUTS(0).R7[Box].get == SELF                  &&
            (
                (  // Call
                    isCall                                                                   &&
                    output0Token1._2 == selfToken0._2                                        && // keep all underlying tokens
                    output0Token0._2 == ((selfToken0._2 - 1L) / shareSizeAdjusted) + 1L      && // minted option 1 stay in the box for both
                    OUTPUTS(0).tokens.size == 2
                ) ||
                (   // Put
                    !isCall                                                                     &&
                    OUTPUTS(0).tokens.size == 1                                                 &&
                    output0Token0._2 == (valueIn - MinOptionReserveValue) / strikePrice + 1L // minted option 1 stay in the box
                )
            )
        
        validBasicReplicatedOutput0                                &&
        validMintedOption                                          &&
        OUTPUTS(1).propositionBytes == dAppUIFeeErgoTree           &&
        OUTPUTS(1).value >= dAppUIMintFee
    } else {
        false
    }

    val validCloseOptionContract: Boolean = if ((isExpired && !isExercible) || isEmpty) {
        OUTPUTS(0).propositionBytes == issuerPK.propBytes          &&
        OUTPUTS(0).value >= valueIn - TxFee                        &&
        output0Token0._1 == selfToken1._1                          &&
        output0Token0._2 == selfToken1._2
    } else {
        false
    }

    val validBuyOption: Boolean = if (!isFrozen && INPUTS.size == 2 && CONTEXT.dataInputs.size > 0) {
        // Oracle Info
        val oracleBox: Box = CONTEXT.dataInputs(0)
        val oraclePrice: Long = oracleBox.R4[Long].get // nanoerg per token
        val oracleHeight: Long = oracleBox.R5[Int].get
        val validOracle: Boolean = oracleBox.tokens(0)._1 == OracleTokenId && HEIGHT <= oracleHeight + 30

        // SQRT values
        val SQRTy: Coll[Long] = Coll(0L, 100L, 500L, 1000L, 2000L, 4000L, 9000L, 13000L, 20000L, 30000L, 40000L,
            50000L, 70000L, 110000L, 140000L, 170000L, 210000L, 250000L, 300000L, 500000L )
        val SQRTx: Coll[Long] = SQRTy.map{(n: Long) => n * n}
        val SQRT: Coll[(Long, Long)] = SQRTx.zip(SQRTy)
        
        // duration in year
        // european premium price = 0.4 * sigma * strike price * SQRT(duration) * (1 + K1 * ABS(underlying price - strike price) / strike price)
        // american premium price = (1 + K2 * SQRT(duration)) * european premium price
        // make linear regression to approximate the square root of the remaining duration
        // use BigInt to avoid overflow
        val intrinsicPrice: Long = if (isCall) { // Call
            max(0L, (oraclePrice - strikePrice) * shareSize)  // nanoerg per option
        } else { // Put
            max(0L, (strikePrice - oraclePrice) * shareSize)  // nanoerg per option
        }
        
        val indSQRT: Int = SQRT.map{(kv: (Long, Long)) => if (kv._1 >= remainingDuration) {1L} else {0L}}.indexOf(1L, 0)
        val afterPoint: Long = SQRT(indSQRT)
        val beforePoint: Long = SQRT(indSQRT - 1)
        val sqrtDuration: BigInt = beforePoint._2 + (afterPoint._2 - beforePoint._2).toBigInt * (remainingDuration - beforePoint._1) / (afterPoint._1 - beforePoint._1)
        val maxTimeValue: BigInt = (4 * sigmaVol * shareSize.toBigInt * strikePrice * sqrtDuration ) / (10 * 1000 * 177584 ) // 177584 = SQRT(3600*1000*24*365)
        val priceSpread: BigInt = max(oraclePrice - strikePrice, strikePrice - oraclePrice)
        val europeanTimeValue: BigInt = max(0, maxTimeValue - (maxTimeValue * K1 * priceSpread) / (1000 * strikePrice))
        val optionPriceTmp: Long = if (isEuropean) { //european
            intrinsicPrice + europeanTimeValue 
        } else { //american
            val americanTimeValue: BigInt = europeanTimeValue + (europeanTimeValue * K2 * sqrtDuration ) / (1000 * 177584)
            intrinsicPrice + americanTimeValue 
        }
        val pricePrecision: Long = 10000L
        val optionPriceTmp2: Long = max(pricePrecision, optionPriceTmp - (optionPriceTmp % pricePrecision)) // round option price, set a minimum
        val optionPrice: Long = if (isCall) { // Call option cannot cost more the underlying asset
            min(oraclePrice * shareSize, optionPriceTmp2)
        } else { // Put option cannot cost more than the exercise price
            min(strikePrice * shareSize, optionPriceTmp2)
        }

        val deliveredOptions: Long = selfToken0._2 - output0Token0._2
        val totalOptionPrice: Long = deliveredOptions * optionPrice
        val dAppUIFee: Long = max(BoxMinValue, totalOptionPrice * dAppUIFeePerThousand / 1000)
        val issuerPayBoxValue: Long = max(BoxMinValue, deliveredOptions * optionPrice)

        // replicate the option reserve
        validOracle                                                &&
        validBasicReplicatedOutput0                                &&
        OUTPUTS(0).value == valueIn                                &&
        output0Token1._2 == selfToken1._2                          && // valid for Call and Put
        // buyer option delivery, PK verified by the buy request script
        output1Token0._1 == optionTokenIDIn                        &&
        output1Token0._2 == deliveredOptions                       &&
        // issuer pay box
        OUTPUTS(2).propositionBytes == issuerPK.propBytes          &&
        OUTPUTS(2).value >= issuerPayBoxValue                      &&
        // dApp UI Fee
        OUTPUTS(3).propositionBytes == dAppUIFeeErgoTree           &&
        OUTPUTS(3).value >= dAppUIFee
    } else {
        false
    }

    val validExerciseOption: Boolean = if (isExercible && INPUTS.size == 2 && OUTPUTS.size == 4 && CONTEXT.dataInputs.size == 0) {
        val output2Token0: (Coll[Byte], Long) = OUTPUTS(2).tokens.getOrElse(0, (Coll[Byte](),0L))
        val input1Token0: (Coll[Byte], Long) = INPUTS(1).tokens.getOrElse(0, (Coll[Byte](),0L))
        val exercisedAmountReserve: Long = if (isCall) {
            selfToken1._2 - output0Token1._2
        } else {
            valueIn - OUTPUTS(0).value
        }
        val numberOptionExpected: Long = if (isCall) {
            exercisedAmountReserve / shareSizeAdjusted
        } else {
            exercisedAmountReserve / ( strikePrice * shareSize)
        }
        val numberOptionProvided = if (input1Token0._1 == optionTokenIDIn) {
            input1Token0._2
        } else {
            0L
        }

        // replicate the option reserve
        numberOptionExpected == numberOptionProvided                                  &&
        validBasicReplicatedOutput0                                                   &&
        output0Token0._2 == selfToken0._2                                             && // unchanged reserve option token amount
        // buyer delivery, PK verified by the buy request script            
        (
            (
                isCall                                                                &&
                output1Token0._1 == underlyingAssetTokenId                            &&
                output1Token0._2 == exercisedAmountReserve                            &&
                OUTPUTS(1).tokens.size == 1                                           &&
                OUTPUTS(2).value >= numberOptionExpected * strikePrice * shareSize    && // strike price in nanoerg no need to adjust
                OUTPUTS(2).tokens.size == 0
            )
            ||
            (
                !isCall                                                               &&
                OUTPUTS(1).value >= exercisedAmountReserve                            &&
                OUTPUTS(1).tokens.size == 0                                           &&
                output2Token0._1 == underlyingAssetTokenId                            &&
                output2Token0._2 >= numberOptionExpected * shareSizeAdjusted          &&
                OUTPUTS(2).tokens.size == 1
            )
        )                                                                             &&
        // issuer pay box            
        OUTPUTS(2).propositionBytes == issuerPK.propBytes       

    } else {
        false
    }

    // RESULT
    (
        ( // refund the issuer
            issuerPK                                                       && 
            sigmaProp(!isMinted                                            && 
                      OUTPUTS.size == 2                                    &&  // prevent random option minting from the issuer
                      OUTPUTS(0).propositionBytes == issuerPK.propBytes
                     )
        )            
                                        || 
        sigmaProp(                         // action by anyone 
            validMintOption             || 
            validBuyOption              || 
            validExerciseOption         || 
            validCloseOptionContract
            )
    )
}   
