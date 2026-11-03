import React from 'react';
import { LoginForm } from '@/features/auth/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="bq-auth-page-wrapper">
      <div className="container">
        <LoginForm />
      </div>
    </div>
  );
};

