import githubLogo from "../images/Github.png";


export default function Footer() {
    return (
        <div className="bggrey w-100">
            <div >
                © 2023 Haileypdll/ThierryM1212
                &nbsp;
                <a href="https://github.com/ThierryM1212/sigmaO" target="_blank" rel="noreferrer">
                    <img src={githubLogo} width="20" height="20" className="d-inline-block align-top" alt="github" />
                </a>
            </div>
        </div>
    )
}