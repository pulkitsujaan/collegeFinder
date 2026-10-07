import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Self-hosted fonts — no network request, no layout shift, works offline.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

import App from './App.jsx';
import ShortlistProvider from './lib/ShortlistContext.jsx';
import CompareProvider from './lib/CompareContext.jsx';
import AuthProvider from './lib/AuthContext.jsx';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ShortlistProvider>
          <AuthProvider>
            <CompareProvider>
              <App />
            </CompareProvider>
          </AuthProvider>
        </ShortlistProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
