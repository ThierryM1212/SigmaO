        val oraclePrice: Long = oracleBox.value / (oracleBox.tokens(2)._2 / UnderlyingAssetDecimalFactor)
        val validOracle: Boolean = oracleBox.tokens(0)._1 == OracleTokenId              &&
                                   oracleBox.tokens(2)._1 == UnderlyingAssetTokenId