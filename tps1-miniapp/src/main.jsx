import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './css/app.css';

// Zalo Mini App doesn't upload index.html, so 'root' might not exist.
// It usually provides 'app', or we can create one dynamically.
let rootElement = document.getElementById('root') || document.getElementById('app');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
