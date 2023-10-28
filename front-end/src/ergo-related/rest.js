import ls from 'localstorage-slim';
import JSONBigInt from 'json-bigint';

export async function post(url, body = {}, apiKey = '') {
    return await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'mode': 'cors',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
            'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
            api_key: apiKey,
        },
        body: JSONBigInt.stringify(body),
    });
}

export async function get(url, apiKey = '', ttl = 0) {
    var res_cache = {};
    try {
        if (ttl > 0) {
            ls.flush();
            res_cache = ls.get('web_cache_' + ttl.toString()) ?? {};
            if (Object.keys(res_cache).includes(url)) {
                //console.log("res_cache", res_cache[url])
                return res_cache[url];
            }
        }
        const result = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'mode': 'cors',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
                'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
                api_key: apiKey,
            }
        });
        //console.log("get", result)
        const resText = await result.text();
        const resJson = JSONBigInt.parse(resText)
        if (ttl > 0 && result.status === 200) {
            res_cache = ls.get('web_cache_' + ttl.toString()) ?? {};
            res_cache[url] = resJson;
            ls.set('web_cache_' + ttl.toString(), res_cache, { ttl: ttl })
        }
        return resJson;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getText(url, apiKey = '') {
    try {
        return await fetch(url, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'mode': 'cors',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
                'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
                api_key: apiKey,
            }
        }).then(res => res.text());
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getStream(url, apiKey = '') {
    try {
        const response = await fetch(url)
        const responseTxt = await response.text();
        return responseTxt;
    } catch (e) {
        console.error(e);
        return "";
    }
}

export async function getBlob(url) {
    try {
        const result = await fetch(url).then(res => res.arrayBuffer());
        return result;
    } catch (e) {
        console.error(e);
        return [];
    }
}
