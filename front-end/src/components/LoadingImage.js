
import SigmaOLogo from "../images/sigmaOLogo_24dp.svg";

export default function LoadingImage() {
    return (
        <div className="w-1OO d-flex flex-column">
            <img className="rotate" src={SigmaOLogo} height={50} alt="sigmao logo" />
        </div>
    )
}