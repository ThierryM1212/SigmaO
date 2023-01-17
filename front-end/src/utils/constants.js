import { UnderlyingToken } from "./UnderlyingToken";

export const NANOERG_TO_ERG = 1000000000;
export const MIN_NANOERG_BOX_VALUE = 0.001 * NANOERG_TO_ERG;
export const TX_FEE = 1100000;

export const DEFAULT_EXPLORER_API_ADDRESS = "https://api.ergoplatform.com/";
export const DEFAULT_EXPLORER_ADDRESS = "https://explorer.ergoplatform.com/";


export const OPTION_TYPES = [
    {
        label: 'Call',
        id: 0,
    },
    {
        label: 'Put',
        id: 1,
    }
]

export const OPTION_STYLES = [
    {
        label: 'European',
        id: 0,
    },
    {
        label: 'American',
        id: 1,
    }
]

export const BUY_OPTION_REQUEST_SCRIPT_ADDRESS="MZ4DGZnZL4rrxJ45amiyx8cvHrifo5PL82vwbrNEd19cMG2ALKk94md25VU8exnSexUfexvhDX8HHpUpLh3nSHno1VFt5pSoTcoHBDNzUHAGgf8N5mCD1KpG1GM1o6AKCLBKv";

export const OPTION_CALL_SCRIPT_ADDRESS_FAKEUSD="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";
export const EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS_FAKEUSD="62M2yU7HrdVBiKvpDnciBEe8Zehgd8u5gXiAM11F2Vsp1dox67Bz31LHUn3hsLwRFSNAFZv2DW9XPQxYjCaThYbMP7B2mSvHc6bo7Uz5SWZHk1KruudsDmXLFfYUG3h5EX5XTBrruBT6poPM4seSXf8heqAVCYUjmTnkAqYvdSEtXMmk1spz82rndwqnbuxiKwjT6XsJLC6e7H8wx6fnLxyrRNEatdKU7VwBrwNRE2cnKMqMfpRFxaWUqTaGHbKiguaiG7Hnc2MVJnYASxoF1HiGHySuHoAqxBPPWfEf1JmBpjumnFLPzzoGPgu3ojY5mNM8Nc8EcgkBQ1YZwedTYJ23qDQzg89YAjiUyyUbyA2kn4cCEtzNYbfjhwr85GCnQ4s6eMAcoCKHm3ZZ5fNMrBq1pn6zaZVz6Dws54XQxnhhrXBWMeM3XP29ou4LH7FNZY1z3BqTPYvtRq6a3ab2XF9WCfUpxZZ8qsnqRmCWS94TZn1WLcyfmxBFYnxbtoFcU";




export const OPTION_CALL_SCRIPT_ADDRESS_SIGUSD="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";
export const EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS_SIGUSD="62M2yU7HrdVC75x8wuhEYshFPtNEEbWv8KeNV4PgmpcBAEtxhyjUMfUm3YGPnsqFbM6m9x6dn2TfMwVPxKAJFcKypUcPG9VR5gVpAPLmAkLCneB3rqdCoRKsHK9ek3xfxfMnoQXVVj8RYh1FGBj6smT4K459c8HKXyemFagiQrN7UDCkVysSyeDGZiWiM3Q8LTQe3uzxNg9ATN4SykjJZcxzgheCv9XXYjb3ziWdnwsJdsWuTcEDSGEaCDfSniSXVvqw9YzfXeneiQPBR5cTXbQuK3WZLhVfZWvj4T82YR9v7GqwxU6ZE2Mcia6gecrwZLvAkBpZYYXHXB4q1SbYhc6LreiafMcBLpgvMFyJie4dppQS19pTahpAY4Bz5U1mUw58yJdmFruLXKjjhwj9zgUz83J1j3Gxd2wnmkQZ2hKCot7sYvEPN1m4ufYwj6FKmUBpj9afwrhYeMoVHJjoi2zcX91PDTZZ1Txih5m9FHuCnPrGsLu5qthYHw2sCxUfT";


// SigUSD
export const SIGUSD_TOKEN_ID = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04';
export const SIGUSD_TOKEN_DECIMALS = 2;
export const SIGUSD_ORACLE_TOKEN_ID = '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f';

// FakeUSD test token
export const FAKEUSD_TOKEN_ID = '777777e5051f8a6bc30827ee41dd39e04bca1dba35236b9a26b494e0bac84f33';
export const FAKEUSD_TOKEN_DECIMALS = 2;
export const FAKEUSD_ORACLE_TOKEN_ID = '6666668ce353fefd146d14b41482d526ebf26a5a7d204f36570c59c558136b83';


export const UNDERLYING_TOKENS = [
    new UnderlyingToken(
        'SigUSD', 
        SIGUSD_TOKEN_ID, 
        SIGUSD_TOKEN_DECIMALS, 
        SIGUSD_ORACLE_TOKEN_ID,
        OPTION_CALL_SCRIPT_ADDRESS_SIGUSD,
        EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS_SIGUSD,
    ),
    new UnderlyingToken(
        'fakeUSD', 
        FAKEUSD_TOKEN_ID, 
        FAKEUSD_TOKEN_DECIMALS, 
        FAKEUSD_ORACLE_TOKEN_ID,
        OPTION_CALL_SCRIPT_ADDRESS_FAKEUSD,
        EXERCISE_OPTION_REQUEST_SCRIPT_ADDRESS_FAKEUSD,
    )
]

export const DAPP_UI_MINT_FEE = 1000000; //0.001 ERG
export const DAPP_UI_FEE = 5; // 0.5%
export const DAPP_UI_ERGOTREE = "0008cd039ed9a6df20fca487da2d3b58e822cdcc5bcfad4cca794eadf132afa3113f31a6";


export const SQRTbase = [
    0, 100, 500, 1000, 2000, 4000, 9000, 13000, 20000, 30000, 40000,
            50000, 70000, 110000, 140000, 170000, 210000, 250000, 300000, 500000
];
