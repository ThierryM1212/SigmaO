import { Navbar, Nav } from 'react-bootstrap';
import Logo from "../images/sigmaOLogo_24dp.svg";
import InputAddress from './InputAddress';

function NavigationBar(props) {
    return (
        <Navbar expand="lg" variant="dark" className="sticky-top w-100 color-nav">
            <Navbar.Brand href="/">
                <img src={Logo} alt="logo" width={48} className="hidden-mobile" />
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto align-items-center">
                    <Nav.Link href={"/"}><h2>Sigma'O</h2></Nav.Link>
                    <Nav.Link href={"/dashboard"}><h5>Dashboard</h5></Nav.Link>
                    <Nav.Link href={"/mint-options"}><h5>Create options</h5></Nav.Link>
                    <Nav.Link href={"/exercise-options"}><h5>Exercise options</h5></Nav.Link>
                    <Nav.Link href={"/buy-options"}><h5>Buy options</h5></Nav.Link>
                    <Nav.Link href={"/sell-options"}><h5>Sell options</h5></Nav.Link>
                    <Nav.Link href={"/buy-tokens"}><h5>Buy tokens</h5></Nav.Link>
                    <Nav.Link href={"/sell-tokens"}><h5>Sell tokens</h5></Nav.Link>
                </Nav>
            </Navbar.Collapse>
            <InputAddress />
        </Navbar>
    );
}
export default NavigationBar;

