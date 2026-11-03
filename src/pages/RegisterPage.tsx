import React from 'react';
import { RegisterForm } from '@/features/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <div className="bq-auth-page-wrapper">
      <div className="container">
        <RegisterForm />
      </div>
    </div>
  );
};

