import Swal from 'sweetalert2/src/sweetalert2.js';
import withReactContent from 'sweetalert2-react-content';
import { formatLongString } from './utils';
import { encodeContract } from '../ergo-related/serializer';
import { disconnectWallet } from '../ergo-related/wallet';

export function waitingAlert(title) {
    const MySwal = withReactContent(Swal)
    Swal.fire({
        title: title,
        allowOutsideClick: false,
        showConfirmButton: false,
    });
    return MySwal;
}

export function errorAlert(title, msg) {
    const MySwal = withReactContent(Swal)
    MySwal.fire({
        title: title,
        icon: 'error',
        text: msg,
        allowOutsideClick: false,
    });
    return MySwal;
}

export function confirmAlert(msg, txt, confirmMsg = 'Yes', denyMsg = 'No') {
    return Swal.fire({
        title: msg,
        html: txt,
        showDenyButton: true,
        confirmButtonText: confirmMsg,
        denyButtonText: denyMsg,
        allowOutsideClick: false,
    })
}

export function displayTransaction(txId) {
    const MySwal = withReactContent(Swal)
    MySwal.fire({
        title: "Transaction sent succesfully",
        allowOutsideClick: true,
        icon: 'success',
        showCloseButton: true,
        html: `<p>The transaction will be visible in few seconds: <a href="https://explorer.ergoplatform.com/en/transactions/${txId}" target="_blank" > ${txId} </a></p>`,
    });
    return MySwal;
}

export function displayErgoPayTransaction(txId, reducedTx) {
    const MySwal = withReactContent(Swal)
    MySwal.fire({
        title: "Sign the transaction using ergo mobile wallet",
        allowOutsideClick: true,
        icon: 'success',
        showConfirmButton: true,
        html: <div className='align-center'><p>Send the transaction to the wallet </p>
            <button className='btn btn-blue m-1' onClick={() => {
                const url = `ergopay:${reducedTx}`;
                window.open(url, '_blank').focus();
            }} > Sign with ErgoPay
            </button>
        </div>
        ,
    },
        function () {
            window.location.reload();
        });
    return MySwal;
}

export function promptOptionAmount(title, max) {
    return new Promise(function (resolve, reject) {
        var html = "<div class='align-center'>"
        html = html + '<input type="text" id="optionAmount" class="swal2-input" placeholder="Token amount" autocomplete="off">'
        if (max) {
            html = html + `<button class="btn-yellow" onClick="document.getElementById('optionAmount').value= ${max};" >max (${max})</button>`;
        }
        html = html + "<div>";
        Swal.fire({
            title: title,
            html: html,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const optionAmount = Swal.getPopup().querySelector('#optionAmount').value;
                console.log("optionAmount", optionAmount, Number.isInteger(optionAmount))
                if (!parseInt(optionAmount) || parseInt(optionAmount) < 0) {
                    Swal.showValidationMessage(`The token amount is invalid`);
                }
                if (parseInt(optionAmount) > max) {
                    Swal.showValidationMessage(`Not enough token to sell`);
                }
                return { optionAmount: parseInt(optionAmount) };
            }
        }).then((result) => {
            if (result.value) {
                resolve(result.value.optionAmount);
            } else {
                reject();
            }
        });
    });
}

export function promptErgAddr(title = "Set ERG address", defaultValue = "ERG Address") {
    return new Promise(function (resolve, reject) {
        Swal.fire({
            title: title,
            html: `<div class='align-center'><input type="text" size=53 id="ergAddress" class="swal2-input" value="${defaultValue}"></div>`,
            focusConfirm: false,
            showCancelButton: true,
            showConfirmButton: true,
            preConfirm: async () => {
                const ergAddress = Swal.getPopup().querySelector('#ergAddress').value;
                try {
                    await encodeContract(ergAddress)
                } catch (e) {
                    Swal.showValidationMessage(`The ERG address is invalid`);
                }
                return { ergAddress: ergAddress };
            }
        }).then((result) => {
            if (result.value) {
                resolve(result.value.ergAddress);
            } else {
                reject();
            }
        });
    });
}

export function promptErgAddrList(addrList) {
    return new Promise(function (resolve, reject) {
        var inputOptions = {};
        for (const addr of addrList) {
            inputOptions[addr] = formatLongString(addr, 10);
        }
        //console.log("inputOptions[addrList[0]]",addrList[0]);
        Swal.fire({
            title: "Set ERG address",
            input: 'select',
            inputValue: localStorage.getItem('address') ?? '',
            inputOptions: inputOptions,
            focusConfirm: false,
            showCancelButton: true,
            showConfirmButton: true,
            showDenyButton: addrList.length > 0,
            denyButtonText: `Disconnect`,
            customClass: {
                input: "monotype",
            },
            inputValidator: function (value) {
                return new Promise(function (resolve, reject) {
                    if (value !== '') {
                        resolve()
                    } else {
                        reject('The ERG address is invalid')
                    }
                })
            }
        }).then(function (result) {
            if (result.isConfirmed) {
                if (result.value) {
                    resolve(result.value);
                } else {
                    reject();
                }
            } else if (result.isDenied) {
                console.log("result.isDenied")
                disconnectWallet().then(resolve(''));
            } else {
                reject();
            }
        });
    });
}
