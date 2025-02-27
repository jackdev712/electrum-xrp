// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';

import Home from './components/Home';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <Router>
          <div style={{ fontFamily: 'sans-serif' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
        </Router>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
