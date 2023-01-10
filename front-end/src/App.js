import './App.css';
import React from 'react';
import InputAddress from './components/InputAddress';
import Footer from './components/Footer';
import MintTabs from './components/MintTabs';

export default class App extends React.Component {

  render() {
    return (
      <div className="App d-flex flex-column justify-content-between align-items-center">
        <div className="w-100 d-flex flex-column align-items-center">
          <div className="w-100 d-flex flex-row justify-content-between align-items-center bggrey">
            <div className='d-flex flex-column  align-items-start m-1 p-1'>
              <h2>&nbsp;Sigma'O</h2>
              
            </div>
            <InputAddress />
          </div>
          <MintTabs />
        </div>
        <Footer />
      </div>
    );
  }

}
