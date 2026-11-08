import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#059669',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
          Administrator huquqi tekshirilmoqda...
        </p>
      </div>
    );
  }

  // Not logged in -> redirect to login preserving location
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not admin -> Access Denied screen
  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #FECDD3',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#FFE4E6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#E11D48',
            }}
          >
            <ShieldAlert size={34} />
          </div>

          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#9F1239',
              marginBottom: '0.75rem',
            }}
          >
            Ruxsat cheklangan (Access Denied)
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              color: '#4B5563',
              lineHeight: 1.6,
              marginBottom: '1rem',
            }}
          >
            Ushbu bo‘lim faqat <strong>OneShop tizim ma’murlari (Admin)</strong> uchun mo‘ljallangan.
            Sizning hisobingizda Firebase Custom Claims orqali tasdiqlangan administratorlik huquqi mavjud emas.
          </p>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              color: '#64748B',
              marginBottom: '1.5rem',
              border: '1px solid #E2E8F0',
            }}
          >
            Kirilgan hisob: <strong style={{ color: '#0F172A' }}>{user.email || user.uid}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              Bosh sahifaga qaytish
            </Link>

            <button
              onClick={() => logout()}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

