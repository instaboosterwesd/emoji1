import React from 'react';
import { createRoot } from 'react-dom/client';
import './base.css';
import App from '../../src/main.jsx';

// Lock this session permanently to low-performance mode
localStorage.setItem('perf_dont_ask', '1');
localStorage.setItem('perf_mode', 'low');

createRoot(document.getElementById('root')).render(React.createElement(App));
