import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { FirebaseStatusBanner } from '@/components/common/FirebaseStatusBanner';

export const Layout: React.FC = () => {
  return (
    <div className="bq-app-layout">
      <FirebaseStatusBanner />
      <Header />
      <main className="bq-main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
