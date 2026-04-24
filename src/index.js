import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { queryClient } from './queryClient';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
