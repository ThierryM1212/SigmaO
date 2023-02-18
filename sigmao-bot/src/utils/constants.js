export const NANOERG_TO_ERG = 1000000000;
export const MIN_NANOERG_BOX_VALUE = 1000000;
export const TX_FEE = 1100000;
export const DAPP_UI_MINT_FEE = 1000000; //0.001 ERG
export const DAPP_UI_FEE = 5; // 0.5%
export const DAPP_UI_ERGOTREE = "0008cd039ed9a6df20fca487da2d3b58e822cdcc5bcfad4cca794eadf132afa3113f31a6";
export const DAPP_UI_ADDRESS = "9hfmJjrmeyhNgQZks1NzvrJyNgtHuMinnZbrupk6gGxTZWQQf87";
export const SQRTbase = [
    0, 100, 500, 1000, 2000, 4000, 9000, 13000, 20000, 30000, 40000,
            50000, 70000, 110000, 140000, 170000, 210000, 250000, 300000, 500000, 1000000, 10000000
];
export const DEFAULT_EXPLORER_API_ADDRESS = "https://api.ergoplatform.com/";
export const DEFAULT_EXPLORER_ADDRESS = "https://explorer.ergoplatform.com/";

export const DEFAULT_OPTION_DURATION = 30; // days
export const MAX_UI_OPTION_DURATION = 90; // days

export const TOKENJAY_SALES_URL = "https://tokenjay.app/app/#sales";

export const OPTION_TYPES = [
    {
        label: 'Call',
        id: 0,
        comment: 'Grant to buy',
    },
    {
        label: 'Put',
        id: 1,
        comment: 'Grant to sell',
    }
]

export const OPTION_STYLES = [
    {
        label: 'European',
        id: 0,
        comment: 'Exercible during 24h after the maturity date (GMT)',
    },
    {
        label: 'American',
        id: 1,
        comment: 'Exercible up to the maturity date (GMT)',
    }
]

export const TX_FEES = [1100000, 2000000];
