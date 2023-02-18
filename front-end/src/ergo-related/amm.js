import { get } from './rest';

const AMMApi = 'https://api.spectrum.fi/v1/amm/pools/summary';

export async function getAMMPrices() {
    const AMMPrices = await get(AMMApi, '', 15);
    return AMMPrices.map(q => { return { tokenId: q.quoteId, name: q.quoteSymbol, price: q.lastPrice } })
}

