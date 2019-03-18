import React, { Component } from 'react';
import './App.css';
import Header from './components/Header';
import Trains from './components/Trains';

class App extends Component {
    render() {
      return (
        <div className="App">
            <Header/>
            <Trains/>
        </div>
    );
  }
}

export default App;