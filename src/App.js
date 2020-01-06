import React from 'react';
import './reset-css.scss';
import './App.scss';

import Home from './home/home';
import HomeNoweb3 from './home/homeNoweb3';

function App() {
  if (window.web3 && typeof (window.web3) === 'object') {
    return (
      <div className="App">
        <Home />
      </div>
    );
  } else {
    return (
      <div className="App">
        <HomeNoweb3 />
      </div>
    );
  }
}

export default App;
