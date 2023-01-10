
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
        body: JSON.stringify(body),
    });
}
export async function get(url, apiKey = '') {
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
        }).then(res => res.json());
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
