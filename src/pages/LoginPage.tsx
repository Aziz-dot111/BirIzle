import React from 'react';
import { LoginForm } from '@/features/auth/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div
      style={{
        paddingTop: '3.5rem',
        paddingBottom: '4.5rem',
        minHeight: 'calc(100vh - 4.25rem - 300px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="container">
        <LoginForm />
      </div>
    </div>
  );
};
