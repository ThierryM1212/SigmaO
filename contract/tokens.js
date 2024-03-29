const TOKENS = [
    {
        name: "SigUSD",
        tokenId: "03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04",
        decimals: 2,
        oracleTokenId: "011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f",
        oracleType: "Oracle",
        icon: "sigusd.svg",
    },
    {
        name: "SigRSV",
        tokenId: "003bd19d0187117f130b62e1bcab0939929ff5c7709f843c5c4dd158949285d0",
        decimals: 0,
        oracleTokenId: "1d5afc59838920bb5ef2a8f9d63825a55b1d48e269d7cecee335d637c3ff5f3f",
        oracleType: "Spectrum LP",
        icon: "sigrsv.svg",
    },
    {
        name: "COMET",
        tokenId: "0cd8c9f416e5b1ca9f986a7f10a84191dfb85941619e49e53c0dc30ebf83324b",
        decimals: 0,
        oracleTokenId: "1f01dc8e29806d96ca0b79f8e798cd8cfce51c0e676aaedf6ab3464b37da9dfd",
        oracleType: "Spectrum LP",
        icon: "comet.png",
    },
    {
        name: "ergopad",
        tokenId: "d71693c49a84fbbecd4908c94813b46514b18b67a99952dc1e6e4791556de413",
        decimals: 2,
        oracleTokenId: "d7868533f26db1b1728c1f85c2326a3c0327b57ddab14e41a2b77a5d4c20f4b2",
        oracleType: "Spectrum LP",
        icon: "ergopad.svg",
    },
    {
        name: "NETA",
        tokenId: "472c3d4ecaa08fb7392ff041ee2e6af75f4a558810a74b28600549d5392810e8",
        decimals: 6,
        oracleTokenId: "7d2e28431063cbb1e9e14468facc47b984d962532c19b0b14f74d0ce9ed459be",
        oracleType: "Spectrum LP",
        icon: "neta.svg",
    },
    {
        name: "EXLE",
        tokenId: "007fd64d1ee54d78dd269c8930a38286caa28d3f29d27cadcb796418ab15c283",
        decimals: 4,
        oracleTokenId: "a62a1603bae6c0d293f7b954672de6fa8eae9793d433cb02ee49dce736da54ac",
        oracleType: "Spectrum LP",
        icon: "exle.svg",
    },
    {
        name: "AHT",
        tokenId: "18c938e1924fc3eadc266e75ec02d81fe73b56e4e9f4e268dffffcb30387c42d",
        decimals: 4,
        oracleTokenId: "92b1600f001b3f03d7152d7da90ebe6b46fc43edd9f325adbf1677b443520dcb",
        oracleType: "Spectrum LP",
        icon: "aht.svg",
    },
    {
        name: "EGIO",
        tokenId: "00b1e236b60b95c2c6f8007a9d89bc460fc9e78f98b09faec9449007b40bccf3",
        decimals: 4,
        oracleTokenId: "9c1d78e53e7812df96bbb09b757ee1e059c5a298d85789b5c82a7222c34e8f61",
        oracleType: "Spectrum LP",
        icon: "egio.svg",
    },
    {
        name: "EPOS",
        tokenId: "00bd762484086cf560d3127eb53f0769d76244d9737636b2699d55c56cd470bf",
        decimals: 4,
        oracleTokenId: "04f468174eddbc68bce3f0965dd14bc6ed1443f5a405ec7f7f9925d999370b97",
        oracleType: "Spectrum LP",
        icon: "epos.svg",
    },
    {
        name: "Erdoge",
        tokenId: "36aba4b4a97b65be491cf9f5ca57b5408b0da8d0194f30ec8330d1e8946161c1",
        decimals: 0,
        oracleTokenId: "3d4fdb931917647f4755ada29d13247686df84bd8aea060d22584081bd11ba69",
        oracleType: "Spectrum LP",
        icon: "erdoge.svg",
    },
    {
        name: "Ergold",
        tokenId: "e91cbc48016eb390f8f872aa2962772863e2e840708517d1ab85e57451f91bed",
        decimals: 0,
        oracleTokenId: "ea6d2ceff1565ac062cb260f558f1ed492dcd805dcd83fd1ecaf0e0407c8f1ff",
        oracleType: "Spectrum LP",
        icon: "ergold.svg",
    },
    {
        name: "ErMoon",
        tokenId: "9dbc8dd9d7ea75e38ef43cf3c0ffde2c55fd74d58ac7fc0489ec8ffee082991b",
        decimals: 2,
        oracleTokenId: "4b5541bef755585f681d9c9bbf06f3ead9dd69ab120f5ab87094d26ca8057b94",
        oracleType: "Spectrum LP",
        icon: "ermoon.svg",
    },
    {
        name: "Flux",
        tokenId: "e8b20745ee9d18817305f32eb21015831a48f02d40980de6e849f886dca7f807",
        decimals: 8,
        oracleTokenId: "47d68f8a400798230bd0620ead41ab608dffad29d104bcfde8d8a23c19fc61f7",
        oracleType: "Spectrum LP",
        icon: "flux.svg",
    },
    {
        name: "kushti",
        tokenId: "fbbaac7337d051c10fc3da0ccb864f4d32d40027551e1c3ea3ce361f39b91e40",
        decimals: 0,
        oracleTokenId: "3d648a56fc4749fe7822a25c0abe6afba7965885880815ad4bfafae5dca7237f",
        oracleType: "Spectrum LP",
        icon: "kushti.svg",
    },
    {
        name: "LunaDog",
        tokenId: "5a34d53ca483924b9a6aa0c771f11888881b516a8d1a9cdc535d063fe26d065e",
        decimals: 8,
        oracleTokenId: "c1b9c430249bd97326042fdb09c0fb6fe1455d498a20568cc64390bfeca8aff2",
        oracleType: "Spectrum LP",
        icon: "lunadog.png",
    },
    {
        name: "Paideia",
        tokenId: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
        decimals: 4,
        oracleTokenId: "666be5df835a48b99c40a395a8aa3ea6ce39ede2cd77c02921d629b9baad8200",
        oracleType: "Spectrum LP",
        icon: "paideia.svg",
    },
    {
        name: "Terahertz",
        tokenId: "02f31739e2e4937bb9afb552943753d1e3e9cdd1a5e5661949cb0cef93f907ea",
        decimals: 4,
        oracleTokenId: "0b36eb5086ba1d258341723fa4768acaa3804fba982641a00941d5aad2107f50",
        oracleType: "Spectrum LP",
        icon: "terahertz.svg",
    },
    {
        name: "WALRUS",
        tokenId: "59ee24951ce668f0ed32bdb2e2e5731b6c36128748a3b23c28407c5f8ccbf0f6",
        decimals: 0,
        oracleTokenId: "576e9ccb7ee27341b097767a0cf3439c36747cf3226de9a88f314e878f893714",
        oracleType: "Spectrum LP",
        icon: "walrus.png",
    },
    {
        name: "SPF",
        tokenId: "9a06d9e545a41fd51eeffc5e20d818073bf820c635e2a9d922269913e0de369d",
        decimals: 6,
        oracleTokenId: "f40afb6f877c40a30c8637dd5362227285738174151ce66d6684bc1b727ab6cf",
        oracleType: "Spectrum LP",
        icon: "spf.svg",
    },
    {
        name: "GORT",
        tokenId: "7ba2a85fdb302a181578b1f64cb4a533d89b3f8de4159efece75da41041537f9",
        decimals: 0,
        oracleTokenId: "d1c9e20657b4e37de3cd279a994266db34b18e6e786371832ad014fd46583198",
        oracleType: "Spectrum LP",
        icon: "gort.png",
    },
    {
        name: "RSN",
        tokenId: "8b08cdd5449a9592a9e79711d7d79249d7a03c535d17efaee83e216e80a44c4b",
        decimals: 3,
        oracleTokenId: "1b694b15467c62f0cd4525e368dbdea2329c713aa200b73df4a622e950551b40",
        oracleType: "Spectrum LP",
        icon: "rosen.png",
    },
    {
        name: "hodlERG3",
        tokenId: "cbd75cfe1a4f37f9a22eaee516300e36ea82017073036f07a09c1d2e10277cda",
        decimals: 9,
        oracleTokenId: "e8ea3b0f0897df01886c0a1451e81930e44d5c5eb2e5131a306994276cab5c6b",
        oracleType: "Spectrum LP",
        icon: "hodlerg3.svg",
    },
    {
        name: "AuctionCoin",
        tokenId: "52f4544ce8a420d484ece16f9b984d81c23e46971ef5e37c29382ac50f80d5bd",
        decimals: 0,
        oracleTokenId: "d968ce08fd24f3f5fad86f9dded2eaf0920b63c6fd62e56489f74789a8807c2a",
        oracleType: "Spectrum LP",
        icon: "Auction_Coin.png",
    },
    {
        name: "rsADA",
        tokenId: "e023c5f382b6e96fbd878f6811aac73345489032157ad5affb84aefd4956c297",
        decimals: 6,
        oracleTokenId: "ae97c5eccd59a065cd973a8d6afb8bb79f9cc70368a7dcdf73aaeab1cedf6f6b",
        oracleType: "Spectrum LP",
        icon: "rsada.svg",
    },

]

module.exports = {TOKENS};

