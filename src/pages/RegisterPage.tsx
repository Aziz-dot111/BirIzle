import React from 'react';
import { RegisterForm } from '@/features/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
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
        <RegisterForm />
      </div>
    </div>
  );
};
