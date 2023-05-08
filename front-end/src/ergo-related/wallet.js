import JSONBigInt from 'json-bigint';
import { displayErgoPayTransaction, errorAlert } from '../utils/Alerts';
import { promiseTimeout } from '../utils/utils';
import { getBalanceForAddress, getUnconfirmedTxsFor, getUnspentBoxesForAddressUpdated } from './explorer';
import { getTxReducedB64Safe } from './wasm';
let ergolib = import('ergo-lib-wasm-browser');

/* global ergo BigInt */

function hasExtensionConnector() {
    if (typeof window.ergo_check_read_access !== 'undefined') {
        return true;
    } else {
        return false;
    }
}

function hasConnectorInjected() {
    if (typeof ergo !== 'undefined') {
        return true;
    } else {
        return false;
    }
}

export async function isWalletConnected() {
    if (hasExtensionConnector()) {
        try {
            const res = await window.ergo_check_read_access();
            return Promise.resolve(res);
        } catch (e) {
            console.error("isWalletConnected error", e);
            //errorAlert("dApp connector not found 1", "Install Nautilus or SAFEW wallet in your browser");
            return Promise.resolve(false);
        }
    } else {
        return Promise.resolve(true);
    }
}

// Connect to browser extension wallet, return True if success
export async function connectWallet() {
    if (hasExtensionConnector()) {
        try {
            const alreadyConnected = await isWalletConnected();
            //console.log("connectWallet alreadyConnected", alreadyConnected);
            if (!alreadyConnected) {
                await sleep(100)
                const res = await window.ergo_request_read_access();
                await sleep(100); // need to fix SAFEW to remove this wait...
                if (res) {
                    const currentAddress = localStorage.getItem('address') ?? '';
                    const walletAddressList = await getWalletAddressList();
                    if (currentAddress === '' && walletAddressList && walletAddressList.length > 0) {
                        localStorage.setItem('address', walletAddressList[0])
                    }
                }
                return res
            } else {
                return true;
            }
        } catch (e) {
            console.error(e);
            errorAlert("dApp connector not found 2", "Install Nautilus or SAFEW wallet in your browser");
            return false;
        }
    } else {
        return true;
    }

}

export async function disconnectWallet() {
    //console.log("disconnectWallet");
    if (typeof window.ergoConnector !== 'undefined') {
        if (typeof window.ergoConnector.safew !== 'undefined') {
            return await window.ergoConnector.safew.disconnect();
        }
        if (typeof window.ergoConnector.nautilus !== 'undefined') {
            return await window.ergoConnector.nautilus.disconnect();
        }
        return false;
    } else {
        return true;
    }
}

// Check the address is in the connected wallet
export async function isValidWalletAddress(address) {
    //console.log("isValidWalletAddress", address);
    if (hasExtensionConnector()) {
        const walletConnected = await isWalletConnected();
        if (walletConnected && hasConnectorInjected()) {
            const address_list = await ergo.get_used_addresses();
            return address_list.includes(address);
        } else {
            return false;
        }
    } else {
        return true;
    }
}

export async function getWalletAddressList() {
    //console.log("getWalletAddressList");
    if (hasExtensionConnector()) {
        const walletConnected = await isWalletConnected();
        if (walletConnected && hasConnectorInjected()) {
            const address_list = await ergo.get_used_addresses();
            return address_list;
        } else {
            return [];
        }
    } else {
        return [];
    }
}

export async function getBalance(tokenId = 'ERG') {
    //console.log('getBalance', tokenId);
    const walletConnected = await connectWallet();
    //console.log('getBalance2', walletConnected, hasConnectorInjected());
    if (walletConnected && hasConnectorInjected()) {
        //console.log('getBalance3', walletConnected);
        const amount = await ergo.get_balance(tokenId);
        return amount;
    } else {
        //console.log('getBalance4', walletConnected);
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const balance = await getBalanceForAddress(address);
            if (balance.confirmed) {
                if (tokenId === 'ERG') {
                    return balance.confirmed.nanoErgs + balance.unconfirmed.nanoErgs;
                } else {
                    var tokenAmount = 0;
                    for (const tok of balance.confirmed.tokens) {
                        if (tok.tokenId === tokenId) {
                            tokenAmount = tok.amount;
                        }
                    }
                    for (const tok of balance.unconfirmed.tokens) {
                        if (tok.tokenId === tokenId) {
                            tokenAmount = tokenAmount + tok.amount;
                        }
                    }
                    return tokenAmount;
                }
            }
        }
        return 0;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function walletSignTx(alert, tx, address) {
    alert.update({ title: "Connecting to wallet..." });
    const walletAccessGranted = await connectWallet();
    if (walletAccessGranted) {
        if (isValidWalletAddress(address)) {
            alert.update({ title: "Waiting for the transaction signing..." });
            const txId = await processTx(tx);
            if (txId && hasExtensionConnector()) {
                console.log('[txId]', txId);
                alert.update(
                    {
                        title: "Waiting for the transaction to reach the mempool",
                        allowOutsideClick: false,
                        html: `<p>The transaction will be visible in the mempool in few seconds: <a href="https://explorer.ergoplatform.com/en/transactions/${txId}" target="_blank" > ${txId} </a></p>`,
                        showConfirmButton: true,
                    }
                );
                var txFoundMempool = false;
                const startWait = Date.now();
                while (!txFoundMempool && Date.now() - startWait < 60000) {
                    await sleep(3000);
                    try {
                        var unconfirmedTxs = await getUnconfirmedTxsFor(address);
                        //console.log("unconfirmedTxs", unconfirmedTxs)
                        const unconfirmedTx = unconfirmedTxs.filter(tx => tx.id === txId);
                        if (unconfirmedTx.length > 0) {
                            txFoundMempool = true;
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
                alert.close();
                if (txFoundMempool) {
                    window.location.reload();
                } else {
                    errorAlert("The transaction failed to reach the mempool but should be mined in few minutes")
                }
            } else {
                if (hasExtensionConnector()) {
                    const title = "Transaction not signed";
                    const message = "Something went wrong, the transaction was not sent.";
                    errorAlert(title, message);
                }
            }
        } else {
            alert.close();
            const title = "Wrong address";
            const message = "The address " + address + " is not found in the connected wallet. Please double check the ERG address provided and the connected wallet.";
            errorAlert(title, message);
        }
    }
    else {
        alert.close();
        console.log('Wallet access denied');
    }
}

// Get the utxos for the amout of nanoERG in parameter
export async function getUtxos(amountToSend) {
    const fullAmountToSend = BigInt(amountToSend);
    const walletAccessGranted = await connectWallet();
    if (walletAccessGranted && hasExtensionConnector()) {
        console.log("walletAccessGranted")
        const utxos = await ergo.get_utxos(fullAmountToSend.toString());
        const filteredUtxos = [];
        if (utxos && Array.isArray(utxos)) {
            for (const utxo of utxos) {
                try {
                    (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(utxo));
                    filteredUtxos.push(utxo);
                } catch (e) {
                    console.error('[getUtxos] UTxO failed parsing:', utxo, e);
                }
            }
        }
        return filteredUtxos;
    } else {
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            return await getUtxosExplorerByAddress(address, fullAmountToSend)
        }
        return [];
    }
}

async function getUtxosExplorerByAddress(address, amount, tokenId = 'ERG') {
    const addressBoxes = await getUnspentBoxesForAddressUpdated(address);
    var selectedUtxos = [], unSelectedUtxos = addressBoxes, amountSelected = BigInt(0);
    if (amount) {
        const amountInt = BigInt(amount.toString());
        if (tokenId === 'ERG') {
            while (amountSelected < amountInt && unSelectedUtxos.length > 0) {
                selectedUtxos.push(unSelectedUtxos.shift());
                amountSelected = selectedUtxos.reduce((acc, utxo) => acc += BigInt(utxo.value), BigInt(0));
            }
            if (amountSelected < amountInt) {
                selectedUtxos = undefined;
            }
        } else {
            unSelectedUtxos = unSelectedUtxos.filter(utxo => utxo.assets.map(tok => tok.tokenId).includes(tokenId));
            while (amountSelected < amountInt && unSelectedUtxos.length > 0) {
                selectedUtxos.push(unSelectedUtxos.shift());
                amountSelected = selectedUtxos.reduce((acc, utxo) => acc += BigInt(utxo.assets.find(tok => tok.tokenId === tokenId).amount), BigInt(0));
            }
            if (amountSelected < amountInt) {
                selectedUtxos = undefined;
            }
        }
    } else { // all utxos
        selectedUtxos = addressBoxes;
    }
    return selectedUtxos;
}

export async function getTokenUtxos(amountTokenToSend, tokenId) {
    const fullAmountToSend = BigInt(amountTokenToSend);
    const walletAccessGranted = await connectWallet();
    if (walletAccessGranted && hasExtensionConnector()) {
        const utxos = await ergo.get_utxos(fullAmountToSend.toString(), tokenId);
        //console.log("getTokenUtxos", utxos)
        const filteredUtxos = [];
        if (utxos) {
            for (const utxo of utxos) {
                try {
                    (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(utxo));
                    filteredUtxos.push(utxo);
                } catch (e) {
                    console.error('[getUtxos] UTxO failed parsing:', utxo, e);
                }
            }
        } else {
            errorAlert("Not enough token found: " + tokenId + " amount: " + amountTokenToSend)
        }
        return filteredUtxos;
    } else {
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const explorerUtxos = await getUtxosExplorerByAddress(address, fullAmountToSend, tokenId);
            if (explorerUtxos) {
                return explorerUtxos;
            } else {
                errorAlert("Not enough token found: " + tokenId + " amount: " + amountTokenToSend);
            }
        }
        return [];
    }
}

export async function getAllUtxos() {
    var filteredUtxos = [];
    const walletAccessGranted = await connectWallet();
    if (walletAccessGranted && hasExtensionConnector()) {
        const utxos = await ergo.get_utxos();
        for (const utxo of utxos) {
            try {
                (await ergolib).ErgoBox.from_json(JSONBigInt.stringify(utxo));
                filteredUtxos.push(utxo);
            } catch (e) {
                return null;
            }
        }
        return filteredUtxos;
    } else {
        const address = localStorage.getItem('address') ?? '';
        if (address !== '') {
            const explorerUtxos = await getUtxosExplorerByAddress(address);
            return explorerUtxos;
        }
        return [];
    }
}

async function signTx(txToBeSigned) {
    try {
        console.log("signTx", txToBeSigned);
        return await ergo.sign_tx(txToBeSigned);
    } catch (e) {
        console.log(e);
        return null;
    }
}

async function submitTx(txToBeSubmitted) {
    try {
        console.log("submitTx");
        const res = await promiseTimeout(30000, ergo.submit_tx(txToBeSubmitted));
        return res;
    } catch (e) {
        console.log(e);
        return null;
    }
}

async function processTx(txToBeProcessed) {
    const walletAccessGranted = await connectWallet();
    if (walletAccessGranted && hasExtensionConnector()) {
        const msg = s => {
            console.log('[processTx]', s);
        };
        const signedTx = await signTx(txToBeProcessed);
        if (!signedTx) {
            console.error(`No signed transaction found`);
            return null;
        }
        msg("Transaction signed - awaiting submission");
        const txId = await submitTx(signedTx);
        //const txId = await postTxMempool(signedTx);
        if (!txId) {
            console.log(`No submitted tx ID`);
            return null;
        }
        msg("Transaction submitted ");
        return txId;
    } else {
        const [txId, ergoPayTx] = await getTxReducedB64Safe(txToBeProcessed, txToBeProcessed.inputs, txToBeProcessed.dataInputs);
        displayErgoPayTransaction(txId, ergoPayTx);
        return txId;
    }
}

