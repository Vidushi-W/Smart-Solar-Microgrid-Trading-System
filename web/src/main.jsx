import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ConnectedApp.jsx';
import './styles/global.css';
import './styles/brand.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
