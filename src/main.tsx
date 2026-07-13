import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import App from '@/App';
import 'katex/dist/katex.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>,
);
