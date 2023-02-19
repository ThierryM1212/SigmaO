import { Navbar, Nav, Dropdown, NavDropdown } from 'react-bootstrap';
import Logo from "../images/sigmaOLogo_24dp.svg";
import DashboardIcon from "../images/dashboard_white_24dp.svg";
import InputAddress from './InputAddress';
import HelpToolTip from './HelpToolTip';
import './drop-down-dark.css';

function NavigationBar(props) {
    const address = localStorage.getItem('address') ?? '';
    return (
        <Navbar expand="lg" variant="dark" className="sticky-top w-100 color-nav">
            <Navbar.Brand href="/">
                <img src={Logo} alt="logo" width={48} className="hidden-mobile" />
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto align-items-center">
                    <Nav.Link href={"/"}><h2>Sigma'O</h2></Nav.Link>
                    &nbsp;
                    <h5>
                        <NavDropdown
                            id="nav-dropdown-dark-example"
                            title="Options"
                            menuVariant="dark"
                            className='dropdown-menu-dark'
                        >
                            <NavDropdown.Item href="/mint-options">Create</NavDropdown.Item>
                            <NavDropdown.Item href="/exercise-options">Exercise</NavDropdown.Item>
                            <NavDropdown.Item href="/buy-options">Buy</NavDropdown.Item>
                            <NavDropdown.Item href="/sell-options">Sell</NavDropdown.Item>
                        </NavDropdown>
                    </h5>
                    &nbsp;
                    <h5>
                        <NavDropdown
                            id="nav-dropdown-dark-example"
                            title="Tokens"
                            menuVariant="dark"
                        >
                            <NavDropdown.Item href="/buy-tokens">Buy</NavDropdown.Item>
                            <NavDropdown.Item href="/sell-tokens">Sell</NavDropdown.Item>
                        </NavDropdown>
                    </h5>
                </Nav>
            </Navbar.Collapse>
            {
                address !== '' ?
                    <Nav.Link href={"/dashboard"}>
                        <HelpToolTip id="dashboard" image={DashboardIcon} html="My dashboard" width={32} />
                    </Nav.Link>
                    : null
            }

            <InputAddress />
        </Navbar>
    );
}
export default NavigationBar;

