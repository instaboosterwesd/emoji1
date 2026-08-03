import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

localStorage.setItem('perf_dont_ask', '1');
localStorage.setItem('perf_mode', 'low');

const { default: App } = await import('../../src/main.jsx');
createRoot(document.getElementById('root')).render(React.createElement(App));
