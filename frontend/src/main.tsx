import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime:30_000, gcTime:5*60_000, retry:1, refetchOnWindowFocus:false },
    mutations: { retry:0 },
  },
});

// Apply saved theme
try {
  const saved = JSON.parse(localStorage.getItem('verifact-ui')||'{}');
  if (saved?.state?.theme === 'dark') document.documentElement.classList.add('dark');
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '1px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '1px solid var(--paper-mid)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: { primary:'var(--fact-green)', secondary:'var(--paper)' },
              style: { borderLeft:'3px solid var(--fact-green)' },
            },
            error: {
              iconTheme: { primary:'var(--rumor-red)', secondary:'var(--paper)' },
              style: { borderLeft:'3px solid var(--rumor-red)' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
