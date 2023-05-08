import React from 'react';
import { connectWallet, getBalance, getWalletAddressList, isValidWalletAddress, isWalletConnected } from '../ergo-related/wallet';
import { promptErgAddr, promptErgAddrList } from "../utils/Alerts"
import { formatERGAmount, formatLongString, sleep } from '../utils/utils';
import ergoLogo from "../images/ergo-erg-logo.png";


export default class InputAddress extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            ergAmount: 0,
            ergopay: false,
        };
        this.setAddress = this.setAddress.bind(this);
        this.promptErgAddress = this.promptErgAddress.bind(this);
    }

    setAddress(address) {
        const oldAddr = localStorage.getItem('address') ?? '';
        if (oldAddr !== address) {
            localStorage.setItem('address', address);
            window.location.reload();
        }
    };

    async promptErgAddress() {
        var walletConnected = await isWalletConnected();
        if (!walletConnected) {
            walletConnected = await connectWallet();
        }
        const addrList = await getWalletAddressList();
        var newAddr = '';
        if (addrList.length > 0) {
            newAddr = await promptErgAddrList(addrList);
        } else {
            if (walletConnected) {
                newAddr = await promptErgAddr();
            }
        }
        //console.log("promptErgAddress", "*"+newAddr+"*")
        if (newAddr || newAddr === '' ) {
            this.setAddress(newAddr)
        }
    }

    async componentDidMount() {
        await sleep(200);
        const nanoERGAmount = await getBalance('ERG');
        if (!(await isValidWalletAddress(localStorage.getItem('address')))) {
            localStorage.setItem('address', '');
        }
        var ergopay = false;
        if (typeof ergo === 'undefined') {
            ergopay = true;
        }
        //console.log("InputAddress componentDidMount", nanoERGAmount, oatmealAmount)
        this.setState({
            ergAmount: nanoERGAmount,
            ergopay: ergopay,
        });
    }

    render() {
        const address = localStorage.getItem('address') ?? '';
        var glowing = "";
        if (address === '') {
            glowing = "glowing";
        }
        return (
            <div className="zoneaddress d-flex flex-row m-2 p-1 align-items-center">
                <div className='d-flex flex-column'>
                    <button
                        className={"btn btn-address m-1 " + glowing }
                        onClick={this.promptErgAddress}>
                        {
                            address === '' ?
                                <div>Set ERG address</div>
                                :
                                <div>
                                    {formatLongString(address, 6)}
                                    {this.state.ergopay ?
                                        <div>ergopay</div>
                                        : null
                                    }
                                </div>
                        }
                    </button>
                </div>
                {
                    address === '' ?
                        null
                        :
                        <div className="d-flex flex-column m-1 p-1 w-100">
                            <div className="w-100 d-flex flex-row justify-content-between align-items-center">
                                <div><strong>{formatERGAmount(this.state.ergAmount)} </strong></div>
                                &nbsp;
                                <img src={ergoLogo} width="20px" heigth="20px" alt="ERG" />

                            </div>
                        </div>
                }
            </div>
        )
    }
}
