/**
 * Browser entry. This file mounts the connected console (ConnectedApp), which is the only frontend Vite starts.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ConnectedApp.jsx';
import './styles/global.css';
import './styles/brand.css';
import './styles/stations.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
