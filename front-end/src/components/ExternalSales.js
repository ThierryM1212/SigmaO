
import auctionHouseIcon from "../images/Ergo_auction_house_logo.png";
import tokenJayIcon from "../images/tokenjay-main.png";

export default function ExternalSales() {
    return (

        <div className='d-flex flex-column m-2 p-2 zonemint'>
            <h4>Sell on external services</h4>
            <a href="https://ergoauctions.org/" target="_blank" rel="noreferrer">
                <div className="d-flex flex-row justify-content-between align-items-center">
                    <h5>Sell on the Auction House</h5>
                    <img src={auctionHouseIcon} height={50} alt="auction house" />
                </div>
            </a>
            <br/>
            <a href="https://tokenjay.app/" target="_blank" rel="noreferrer">
                <div className="w-100 d-flex flex-row justify-content-between align-items-center">
                    <h5>Sell with TokenJay escrow contract</h5>
                    <img src={tokenJayIcon} height={50} alt="tokenJay" />
                </div>
            </a>

        </div>
    )
}