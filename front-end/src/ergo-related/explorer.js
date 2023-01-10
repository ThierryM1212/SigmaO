import { get } from './rest';
import JSONBigInt from 'json-bigint';
import { DEFAULT_EXPLORER_API_ADDRESS } from '../utils/constants';
import { addressToErgoTree, ergoTreeToTemplateHash } from './serializer';


export const explorerApi = DEFAULT_EXPLORER_API_ADDRESS + 'api/v0';
export const explorerApiV1 = DEFAULT_EXPLORER_API_ADDRESS + 'api/v1';

async function getRequest(url) {
    return get(explorerApi + url).then(res => {
        return { data: res };
    });
}

async function getRequestV1(url) {
    return get(explorerApiV1 + url).then(res => {
        return { data: res };
    });
}

async function postTx(url, body = {}, apiKey = '') {
    console.log("post0", JSONBigInt.stringify(body));
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'mode': 'cors',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        },
        body: JSONBigInt.stringify(body)
    });

    const [responseOk, body2] = await Promise.all([response.ok, response.json()]);
    console.log("post1", body2, responseOk)
    if (responseOk) {
        if (typeof body2 === 'object') {
            //console.log("post2", body2.id)
            return { result: true, data: body2.id };
        } else {
            return { result: true, data: body2 };
        }
    } else {
        if (Object.keys(body2).includes("detail")) {
            return { result: false, data: body2.detail };
        } else {
            return { result: false, data: body2.reason };
        }
    }

}

export async function postTxMempool(tx) {
    try {
        const res = await postTx(explorerApiV1 + '/mempool/transactions/submit', tx);
        return res.data;
    } catch (err) {
        console.log("postTxMempool", err);
        return err.toString()
    }
}

export async function sendTx(json) {
    const res = await postTxMempool(json);
    //const res = await postRequest('transactions', json)
    return res;
}

export async function currentHeight() {
    return getRequest('/blocks?limit=1')
        .then(res => res.data)
        .then(res => res.items[0].height);
}

/////
export async function getUnspentBoxesByAddress(address, limit = 50) {
    const res = await getRequestV1(`/boxes/unspent/byAddress/${address}?limit=${limit}`);
    return res.data.items;
}

export async function getBoxesByAddress(address, limit = 100) {
    const res = await getRequestV1(`/boxes/byAddress/${address}?limit=${limit}`);
    return res.data.items;
}

export async function boxById(id) {
    const res = await getRequest(`/transactions/boxes/${id}`);
    return res.data;
}

export async function boxByIdv1(id) {
    const res = await getRequestV1(`/boxes/${id}`);
    return res.data;
}

/////
export async function boxByTokenId(tokenId) {
    const res = await getRequestV1(`/boxes/unspent/byTokenId/${tokenId}`);
    return res.data.items;
}

/////
export async function getTransactionsByAddress(addr) {
    const res = await getRequestV1(`/addresses/${addr}/transactions`);
    return res.data.items;
}

export async function getUnconfirmedTxsFor(addr) {
    const res = await getRequestV1(`/mempool/transactions/byAddress/${addr}`);
    //console.log("getUnconfirmedTxsFor", res);
    return res.data.items;
}

export async function getSpentAndUnspentBoxesFromMempool(address) {
    try {
        var unconfirmedTxs = await getUnconfirmedTxsFor(address);
        var spentBoxes = [];
        var newBoxes = [];
        if (unconfirmedTxs && unconfirmedTxs.length > 0) {
            spentBoxes = unconfirmedTxs.map(tx => tx.inputs).flat();
            newBoxes = unconfirmedTxs.map(tx => tx.outputs).flat().filter(box => address === box.address);
        }
        //console.log("getSpentAndUnspentBoxesFromMempool", address, spentBoxes, newBoxes)
        return [spentBoxes, newBoxes];
    } catch (e) {
        console.log(e);
        return [[], []];
    }
}

export async function getUnspentBoxesForAddressUpdated(address) {
    try {
        const boxesTmp = await getUnspentBoxesByAddress(address);
        const [spentBoxes, newBoxes] = await getSpentAndUnspentBoxesFromMempool(address);
        const spentBoxIds = spentBoxes.map(box => box.boxId);
        const boxes = newBoxes.concat(boxesTmp).filter(box => !spentBoxIds.includes(box.boxId));
        return boxes;
    } catch (e) {
        console.log(e);
        return [];
    }
}

export async function searchUnspentBoxes(address, tokens, registers = {}, limit = 50) {
    const ergoT = await addressToErgoTree(address);
    var searchParam = { "ergoTreeTemplateHash": await ergoTreeToTemplateHash(ergoT) }
    if (tokens.length > 0) {
        searchParam["assets"] = tokens;
    }
    if (Object.keys(registers).length > 0) {
        searchParam['registers'] = registers;
    }
    const res = await post(explorerApiV1 + `/boxes/unspent/search?limit=${limit}`, searchParam);
    console.log("searchUnspentBoxes", res);
    return res.data.items;
}

export async function searchUnspentBoxesUpdated(address, tokens, registers = {}) {
    const currentBlobBoxes = await searchUnspentBoxes(address, tokens, registers);
    const [spentBlobs, newBlobs] = await getSpentAndUnspentBoxesFromMempool(address);
    const spentBlobBoxIds = spentBlobs.map(box => box.boxId);
    console.log("searchUnspentBoxesUpdated", newBlobs
    .concat(currentBlobBoxes));
    var updatedBlobBoxes = newBlobs
        .concat(currentBlobBoxes)
        .filter(box => box.address === address)
        .filter(box => !spentBlobBoxIds.includes(box.boxId));
    for (const register of Object.keys(registers)) {
        updatedBlobBoxes = updatedBlobBoxes.filter(box => box.additionalRegisters[register].renderedValue === registers[register])
    }
    return updatedBlobBoxes;
}

export async function getExplorerBlockHeaders() {
    return (await getRequestV1(`/blocks/headers`)).data.items.slice(0, 10);
}
export async function getExplorerBlockHeadersFull() {
    return (await getRequestV1(`/blocks/headers`)).data.items;
}

export async function getBalanceForAddress(addr) {
    const res = await getRequestV1(`/addresses/${addr}/balance/total`);
    console.log("getBalanceUnconfirmedForAddress", res)
    return res.data;
}

export async function getOraclePrice(oracleNFTID) {
    const oracleBoxes = await boxByTokenId(oracleNFTID);
    console.log("oracleBoxes", oracleBoxes);
    if (oracleBoxes && oracleBoxes.length == 1) {
        try {
            return oracleBoxes[0].additionalRegisters.R4.renderedValue
        } catch(e) {
            console.log(e);
            return "0";
        }
    } else {
        return "0";
    }
}

async function post(url, body = {}, apiKey = '') {
    //console.log("post0", JSONBigInt.stringify(body));
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'mode': 'cors',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        },
        body: JSONBigInt.stringify(body)
    });

    const [responseOk, body2] = await Promise.all([response.ok, response.json()]);
    //console.log("post1", body2, responseOk)
    if (responseOk) {
        return { result: true, data: body2 };
    } else {
        if (Object.keys(body2).includes("detail")) {
            return { result: false, data: body2.detail };
        } else {
            return { result: false, data: body2.reason };
        }
    }

}