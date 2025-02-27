import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; 
import { Buffer } from 'buffer';
import App from './App';

window.Buffer = window.Buffer || Buffer;

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);
