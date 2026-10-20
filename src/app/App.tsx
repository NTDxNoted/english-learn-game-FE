import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ToastProvider } from './providers/ToastContext';
import { AuthProvider } from '../features/auth/context/AuthProvider';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
};

export default App;
