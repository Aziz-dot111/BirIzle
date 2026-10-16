import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 4.25rem - 300px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#ECFDF5',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: '2px solid #A7F3D0',
          }}
        >
          <HelpCircle size={36} />
        </div>

        <span
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            color: '#064E3B',
            lineHeight: 1,
            display: 'block',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          404
        </span>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
          Kechirasiz, sahifa topilmadi
        </h1>

        <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Siz qidirayotgan sahifa o‘chirilgan, nomi o‘zgartirilgan yoki vaqtincha mavjud emas.
          Kerakli tovar va xizmatlarni bosh sahifadagi qidiruv orqali topishingiz mumkin.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/">
            <Button variant="primary" size="lg" leftIcon={<Home size={18} />}>
              Bosh sahifaga qaytish
            </Button>
          </Link>
          <Link to="/#products">
            <Button variant="outline" size="lg" leftIcon={<Search size={18} />}>
              Katalogga o‘tish
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
