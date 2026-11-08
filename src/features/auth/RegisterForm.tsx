import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { validateRegistrationForm } from '@/utils/validation';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import './AuthForm.css';

export const RegisterForm: React.FC = () => {
  const { register, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.general;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    const validation = validateRegistrationForm(
      {
        displayName,
        email,
        password,
        confirmPassword,
      },
      { requireDisplayName: true }
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!isConfigured) {
      setErrors({
        general:
          'Firebase tizimi hali sozlanmagan. Iltimos, .env.local faylida Firebase sozlamalarini kiriting.',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await register(email, password, displayName);
    setIsSubmitting(false);

    if (!result.success) {
      setErrors({ general: result.error || 'Ro‘yxatdan o‘tishda xatolik yuz berdi.' });
      return;
    }

    setSuccessMessage('Muvaffaqiyatli ro‘yxatdan o‘tdingiz! Tasdiqlash havolasi elektron pochtangizga yuborildi.');
    setTimeout(() => {
      navigate('/profile', { replace: true, state: { newlyRegistered: true } });
    }, 1200);
  };

  return (
    <div className="bq-auth-card animate-fade-in">
      <div className="bq-auth-card__header">
        <Link to="/" className="bq-auth-card__brand" aria-label="Bosh sahifaga qaytish">
          <div className="bq-auth-card__logo-badge">
            <svg viewBox="0 0 32 32" fill="none" className="bq-auth-card__logo-svg" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#047857" />
              <circle cx="14" cy="14" r="6" stroke="#FFFFFF" strokeWidth="2.5" />
              <path d="M18.5 18.5L24 24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="14" cy="14" r="2.5" fill="#34D399" />
            </svg>
          </div>
          <span className="bq-auth-card__brand-title">OneShop</span>
        </Link>
        <h2 className="bq-auth-card__title">Ro‘yxatdan o‘tish</h2>
        <p className="bq-auth-card__subtitle">
          OneShop platformasida yangi akkaunt yarating
        </p>
      </div>

      {!isConfigured && (
        <div className="bq-auth-warning" role="alert">
          <AlertTriangle size={18} className="bq-auth-warning__icon" />
          <div className="bq-auth-warning__text">
            <strong>Firebase sozlanmagan:</strong>
            <p>
              Hozirda ro‘yxatdan o‘tish uchun Firebase kalitlari kiritilmagan.
              Loyihani sozlash uchun README.md yo‘riqnomasiga qarang.
            </p>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bq-auth-error-alert" role="alert">
          <AlertCircle size={18} />
          <span>{errors.general}</span>
        </div>
      )}

      {successMessage && (
        <div className="bq-auth-success-alert" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <form className="bq-auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="To‘liq ism va familiya"
          type="text"
          placeholder="Masalan: Azizbek Karimov"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            clearFieldError('displayName');
          }}
          error={errors.displayName}
          leftIcon={<UserIcon size={18} />}
          required
          autoComplete="name"
        />

        <Input
          label="Elektron pochta"
          type="email"
          placeholder="nomingiz@misol.uz"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
          }}
          error={errors.email}
          leftIcon={<Mail size={18} />}
          required
          autoComplete="email"
        />

        <Input
          label="Parol"
          type="password"
          placeholder="Kamida 6 ta belgi"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError('password');
          }}
          error={errors.password}
          leftIcon={<Lock size={18} />}
          showPasswordToggle
          required
          autoComplete="new-password"
        />

        <Input
          label="Parolni tasdiqlang"
          type="password"
          placeholder="Parolni qayta kiriting"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearFieldError('confirmPassword');
          }}
          error={errors.confirmPassword}
          leftIcon={<Lock size={18} />}
          showPasswordToggle
          required
          autoComplete="new-password"
        />

        <div className="bq-auth-security-notice">
          <ShieldCheck size={16} />
          <span>Ma’lumotlar Cloud Firestore xavfsizlik qoidalari bilan himoyalangan</span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={Boolean(successMessage) || isSubmitting}
          rightIcon={<ArrowRight size={18} />}
          className="bq-auth-submit-btn"
        >
          {isConfigured ? 'Ro‘yxatdan o‘tish' : 'Ro‘yxatdan o‘tish (Firebase kutilmoqda)'}
        </Button>
      </form>

      <div className="bq-auth-card__footer">
        <p>
          Akkauntingiz bormi?{' '}
          <Link to="/login" className="bq-auth-link">
            Tizimga kirish
          </Link>
        </p>
      </div>
    </div>
  );
};
