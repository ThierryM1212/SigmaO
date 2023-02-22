{   
    //////////////////////////////////////////////////////////
    // Sell SigmaO Option priced emulating Black-Scholes
    //////////////////////////////////////////////////////////
    // Needs an Oracle like SigUSD or Spectrum AMM LP to get the underlying token price in nanoerg
    // ERG amount: MinBoxValue + TX_FEE: 2100000 nanoERG
    // Tokens:
    //      0: N options token to sell
    // R4: SigmaProp: Seller PK
    // R5: Box: Option creation box (boxId = optionTokenId)
    // R6: Coll[Long]: [
    //        sigma, // volatility per 1000
    //        K1, // spread factor per 1000
    //        K2, // american factor per 1000
    //        dAppUIFee, // per 1000
    // ]
    // R7: Coll[Byte]: dApp UI ergotree

    val valueIn: Long = SELF.value
    val sellerPK: SigmaProp = SELF.R4[SigmaProp].get
    val optionCreationBox: Box = SELF.R5[Box].get
    val sigmaVol: Long = SELF.R6[Coll[Long]].get(0) // volatility, per 1000
    val K1: Long = SELF.R6[Coll[Long]].get(1) // K spread, per 1000
    val K2: Long = SELF.R6[Coll[Long]].get(2) // K american, per 1000
    val FreezeDelay: Long = SELF.R6[Coll[Long]].get(3)
    val dAppUIFeePerThousand: Long = SELF.R6[Coll[Long]].get(4) // per 1000
    val dAppUIFeeErgoTree: Coll[Byte] = SELF.R7[Coll[Byte]].get
    val selfToken0: (Coll[Byte], Long) = SELF.tokens.getOrElse(0, (Coll[Byte](),0L))

    val output0Token0: (Coll[Byte], Long) = OUTPUTS(0).tokens.getOrElse(0, (Coll[Byte](),0L))
    val output1Token0: (Coll[Byte], Long) = OUTPUTS(1).tokens.getOrElse(0, (Coll[Byte](),0L))

    val isCall: Boolean = optionCreationBox.R8[Coll[Long]].get(0) == 0L // 0 Call, 1 Put
    val isEuropean: Boolean = optionCreationBox.R8[Coll[Long]].get(1) == 0L // 0 european, 1 american
    val shareSize: Long = optionCreationBox.R8[Coll[Long]].get(2) // Number of underlying token granted per option
    val maturityDate: Long = optionCreationBox.R8[Coll[Long]].get(3) // Unix time
    val strikePrice: Long = optionCreationBox.R8[Coll[Long]].get(4) // nanoerg per smallest unit of token
    val TxFee: Long = optionCreationBox.R8[Coll[Long]].get(6) // nanoerg
    
    val optionTokenIDIn: Coll[Byte] = optionCreationBox.id

    val MinSellReserveValue: Long = TxFee + BoxMinValue
    val currentTimestamp: Long = CONTEXT.preHeader.timestamp
    val remainingDuration: Long = maturityDate - currentTimestamp
    val isFrozen: Boolean = currentTimestamp > (maturityDate - FreezeDelay)

    val validOption: Boolean = optionTokenIDIn == selfToken0._1 

    val validBasicReplicatedOutput0: Boolean = if (OUTPUTS(0).propositionBytes == SELF.propositionBytes) {
        validOption                                                &&
        OUTPUTS(0).value >= MinSellReserveValue                    &&
        (
            output0Token0._1 == optionTokenIDIn ||
            output0Token0._2 == 0L
        )                                                          &&
        OUTPUTS(0).R4[SigmaProp].get == sellerPK                   &&
        OUTPUTS(0).R5[Box].get == optionCreationBox                && 
        OUTPUTS(0).R6[Coll[Long]].get == SELF.R6[Coll[Long]].get   &&
        OUTPUTS(0).R7[Coll[Byte]].get == SELF.R7[Coll[Byte]].get
    } else {
        false
    }

    val isEmpty: Boolean = selfToken0._2 == 0L

    val validCloseSellContract: Boolean = if (isFrozen || isEmpty) {
        OUTPUTS(0).propositionBytes == sellerPK.propBytes          &&
        OUTPUTS(0).value >= valueIn - TxFee                        &&
        output0Token0 == selfToken0                                &&
        OUTPUTS.size == 2
    } else {
        false
    }

    val validSellOption: Boolean = if (!isFrozen && INPUTS.size == 2 && CONTEXT.dataInputs.size > 0) {
        // Oracle Info
        val oracleBox: Box = CONTEXT.dataInputs(0)
        val oraclePrice: Long = oracleBox.R4[Long].get // nanoerg per token
        val oracleHeight: Long = oracleBox.R5[Int].get
        val validOracle: Boolean = oracleBox.tokens(0)._1 == OracleTokenId && HEIGHT <= oracleHeight + 30

        // SQRT values
        val SQRTy: Coll[Long] = Coll(0L, 100L, 500L, 1000L, 2000L, 4000L, 9000L, 13000L, 20000L, 30000L, 40000L,
            50000L, 70000L, 110000L, 140000L, 170000L, 210000L, 250000L, 300000L, 500000L, 1000000L, 10000000L )
        val SQRTx: Coll[Long] = SQRTy.map{(n: Long) => n * n}
        val SQRT: Coll[(Long, Long)] = SQRTx.zip(SQRTy)

        def sqrt(n: Long) = {
            // make linear regression to approximate the square root
            val indSQRT: Int = SQRT.map{(kv: (Long, Long)) => if (kv._1 >= n) {1L} else {0L}}.indexOf(1L, 0)
            val afterPoint: Long = SQRT(indSQRT)
            val result: BigInt = if (indSQRT > 0L) {
                val beforePoint: Long = SQRT(indSQRT - 1)
                max(1, beforePoint._2 + (afterPoint._2 - beforePoint._2).toBigInt * (n - beforePoint._1) / (afterPoint._1 - beforePoint._1))
            } else {
                0.toBigInt
            }   
            
            result
        }

        // duration in year
        // european premium price = 0.4 * sigma * strike price * SQRT(duration) * (1 + K1 * SQRT(ABS(underlying price - strike price) / (strike price * duration))
        // american premium price = (1 + K2 * SQRT(duration)) * european premium price
        // use BigInt to avoid overflow
        // compute the Option price for UnderlyingAssetDecimalFactor Option tokens
        val strikePriceAdjusted: Long = strikePrice * UnderlyingAssetDecimalFactor
        val intrinsicPrice: Long = if (isCall) { // Call
            max(0L, (oraclePrice - strikePriceAdjusted) * shareSize)  // nanoerg per option
        } else { // Put
            max(0L, (strikePriceAdjusted - oraclePrice) * shareSize)  // nanoerg per option
        }
        
        val indSQRT: Int = SQRT.map{(kv: (Long, Long)) => if (kv._1 >= remainingDuration) {1L} else {0L}}.indexOf(1L, 0)
        val afterPoint: Long = SQRT(indSQRT)
        val beforePoint: Long = SQRT(indSQRT - 1)
        val sqrtDuration: BigInt = sqrt(remainingDuration)
        val maxTimeValue: BigInt = (4 * sigmaVol * shareSize.toBigInt * strikePriceAdjusted * sqrtDuration ) / (10 * 1000 * 177584 ) // 177584 = SQRT(3600*1000*24*365)
        val sqrtPriceSpread: BigInt = sqrt(max(oraclePrice - strikePriceAdjusted, strikePriceAdjusted - oraclePrice))
        val sqrtStrikePrice: BigInt = sqrt(strikePriceAdjusted)
        val europeanTimeValue: BigInt = max(0, maxTimeValue - (maxTimeValue * K1 * sqrtPriceSpread * 177584) / (1000 * sqrtStrikePrice * max(1.toBigInt, sqrtDuration)))
        val optionPriceTmp: Long = if (isEuropean) { //european
            intrinsicPrice + europeanTimeValue 
        } else { //american
            val americanTimeValue: BigInt = europeanTimeValue + (europeanTimeValue * K2 * sqrtDuration ) / (1000 * 177584)
            intrinsicPrice + americanTimeValue 
        }
        val pricePrecision: Long = 10000L
        val optionPriceTmp2: Long = max(BoxMinValue, optionPriceTmp - (optionPriceTmp % pricePrecision)) // round option price, set a minimum
        val optionPrice: Long = if (isCall) { // Call option cannot cost more the underlying asset
            min(oraclePrice * shareSize, optionPriceTmp2)
        } else { // Put option cannot cost more than the exercise price
            min(strikePriceAdjusted * shareSize, optionPriceTmp2)
        }

        val deliveredOptions: Long = selfToken0._2 - output0Token0._2
        val totalOptionPrice: Long = deliveredOptions * optionPrice / UnderlyingAssetDecimalFactor
        val dAppUIFee: Long = max(BoxMinValue, totalOptionPrice * dAppUIFeePerThousand / 1000)
        val issuerPayBoxValue: Long = max(BoxMinValue, totalOptionPrice)

        // replicate the option reserve
        validOracle                                                &&
        validBasicReplicatedOutput0                                &&
        OUTPUTS(0).value == valueIn                                &&
        // buyer option delivery, PK verified by the buy request script
        output1Token0._1 == optionTokenIDIn                        &&
        output1Token0._2 == deliveredOptions                       &&
        // issuer pay box
        OUTPUTS(2).propositionBytes == sellerPK.propBytes          &&
        OUTPUTS(2).value >= issuerPayBoxValue                      &&
        // dApp UI Fee
        OUTPUTS(3).propositionBytes == dAppUIFeeErgoTree           &&
        OUTPUTS(3).value >= dAppUIFee
    } else {
        false
    }

    // RESULT
    (        
        sellerPK                        || // refund the seller
        sigmaProp(
            validSellOption              || 
            validCloseSellContract
            )
    )
}   
