import React, { Fragment } from "react";
import { getTokenBox } from "../ergo-related/explorer";
import { decodeString } from "../ergo-related/serializer";
import { NTF_TYPES } from "../utils/constants";
import { UNDERLYING_TOKENS } from "../utils/script_constants";
import { getKeyByValue } from "../utils/utils";

export default class TokenImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tokenId: this.props.tokenId,
            width: this.props.width ?? 48,
            tokenImage: undefined,
        };
    }

    async componentDidMount() {
        const images = require.context('../images/asset-icons/', true);
        const underlyingToken = UNDERLYING_TOKENS.find(t => t.tokenId === this.state.tokenId);
        var tokenImage = undefined, tokenImageName = "unknown.svg";;
        if (underlyingToken) {
            tokenImageName = underlyingToken.icon;
            tokenImage = images(`./${tokenImageName}`)
        }
        else {
            const tokenBox = await getTokenBox(this.state.tokenId);
            if (tokenBox) {
                const ipfsPrefix = 'ipfs://';
                if (Object.keys(tokenBox).includes("additionalRegisters")) {
                    if (Object.keys(tokenBox.additionalRegisters).includes("R7")) {
                        if (Object.values(NTF_TYPES).includes(tokenBox.additionalRegisters.R7)) {
                            const type = getKeyByValue(NTF_TYPES, tokenBox.additionalRegisters.R7);
                            //console.log("NFTImage componentDidMount", type)
                            if (Object.keys(tokenBox.additionalRegisters).includes("R9")) {
                                var NFTURL = (await decodeString(tokenBox.additionalRegisters.R9)) ?? '';
                                if (NFTURL.startsWith(ipfsPrefix)) {
                                    NFTURL = NFTURL.replace(ipfsPrefix, 'https://cloudflare-ipfs.com/ipfs/');
                                }
                                if (NFTURL.startsWith('https://')) {
                                    this.setState({ mediaURL: NFTURL, mediaType: type });
                                }
                                //console.log("NFTURL",NFTURL)
                                tokenImage = NFTURL;
                            }
                        }
                    }
                }
            }
        }
        if (!tokenImage) {
            tokenImage = images(`./${tokenImageName}`)
        }

        this.setState({ tokenImage: tokenImage })
    }


    render() {
        return (
            <Fragment>
                {
                    this.props.over ?
                        <img src={this.state.tokenImage} width={this.state.width} height={this.state.width} className="d-inline-block align-top image2" alt={""} />
                        :
                        <img src={this.state.tokenImage} width={this.state.width} height={this.state.width} className="d-inline-block align-top" alt={""} />
                }
            </Fragment>
        )
    }
}

