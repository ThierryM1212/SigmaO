        val oraclePrice: Long = oracleBox.R4[Long].get // nanoerg per token
        val oracleHeight: Long = oracleBox.R5[Int].get
        val validOracle: Boolean = oracleBox.tokens(0)._1 == OracleTokenId && HEIGHT <= oracleHeight + 30