import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 4.25rem - 320px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '1.5px solid var(--color-primary-200)',
            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.1)',
          }}
        >
          <AlertCircle size={38} />
        </div>

        <span
          style={{
            fontSize: '4rem',
            fontWeight: 800,
            color: 'var(--color-primary-950)',
            lineHeight: 1,
            display: 'block',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em',
          }}
        >
          404
        </span>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-slate-900)',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Kechirasiz, sahifa topilmadi
        </h1>

        <p
          style={{
            color: 'var(--color-slate-600)',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '2.25rem',
          }}
        >
          Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.
          Bosh sahifaga qaytib, kerakli tovar va xizmatlarni qidirishingiz mumkin.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/">
            <Button variant="primary" size="lg" leftIcon={<Home size={18} />}>
              Bosh sahifaga qaytish
            </Button>
          </Link>
          <Link to="/#categories-section">
            <Button variant="outline" size="lg" leftIcon={<Search size={18} />}>
              Katalogga o‘tish
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

