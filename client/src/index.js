import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Add this near the top of your index.js file, before React rendering code
if (process.env.NODE_ENV === 'development') {
  // Intercept and filter console errors to suppress expected 401 errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMsg = args.join(' ');
    // Filter out known 401 errors from Supabase
    if (errorMsg.includes('net::ERR_ABORTED 401') && 
        errorMsg.includes('supabase')) {
      return; // Silently ignore these errors
    }
    originalConsoleError.apply(console, args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
