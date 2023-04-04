import './App.css';
import React from 'react';
import Footer from './components/Footer';
import MintTabs from './components/MintTabs';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import AboutPage from './pages/AboutPage';
import ExerciseOptionsPage from './pages/ExerciseOptionsPage';
import BuyOptionsPage from './pages/BuyOptionsPage';
import MintOptionPage from './pages/MintOptionPage';
import SellOptionPage from './pages/SellOptionPage';
import OptionDetailWrapper from './components/OptionDetailWrapper';
import UserDashboard from './pages/UserDashboard';
import SellTokenPage from './pages/SellTokenPage';
import BuyTokensPage from './pages/BuyTokensPage';
import TokenMarketPage from './pages/TokenMarketPage';
import MatrixBackground from './components/MatrixBackground';

export default class App extends React.Component {

  render() {
    return (
      <div className="App">
        <MatrixBackground timeout={60}/>
        <BrowserRouter >
          <NavigationBar />
          <div className='page-container'>
            <Routes>
              <Route path={"/"} element={<TokenMarketPage />} />
              <Route path={"/about"} element={<AboutPage />} />
              <Route path={"/dashboard"} element={<UserDashboard />} />
              <Route path={"/mint-options"} element={<MintOptionPage />} />
              <Route path={"/exercise-options"} element={<ExerciseOptionsPage />} />
              <Route path={"/buy-options"} element={<BuyOptionsPage />} />
              <Route path={"/sell-options"} element={<SellOptionPage />} />
              <Route path={"/buy-tokens"} element={<BuyTokensPage />} />
              <Route path={"/sell-tokens"} element={<SellTokenPage />} />
              <Route path={"/dev"} element={<MintTabs />} />
              <Route path={"/option-details/:tokenId"} element={<OptionDetailWrapper />} />
            </Routes>
          </div>
          <Footer />
        </BrowserRouter>
      </div>
    );
  }

}
