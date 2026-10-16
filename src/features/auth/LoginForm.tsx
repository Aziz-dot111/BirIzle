import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import './AuthForm.css';

export const LoginForm: React.FC = () => {
  const { login, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preserve pathname, search query and hash if redirected from a protected route
  const getDestination = (): string => {
    const stateFrom = (
      location.state as { from?: { pathname?: string; search?: string; hash?: string } | string }
    )?.from;

    if (!stateFrom) return '/profile';
    if (typeof stateFrom === 'string') return stateFrom;
    return `${stateFrom.pathname || '/profile'}${stateFrom.search || ''}${stateFrom.hash || ''}`;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email || errors.general) {
      setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password || errors.general) {
      setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate inputs
    const emailRes = validateEmail(email);
    const passRes = validatePassword(password);

    if (!emailRes.isValid || !passRes.isValid) {
      setErrors({
        email: emailRes.error,
        password: passRes.error,
      });
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
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrors({ general: result.error || 'Tizimga kirishda xatolik yuz berdi.' });
      return;
    }

    navigate(getDestination(), { replace: true });
  };

  return (
    <div className="bq-auth-card animate-fade-in">
      <div className="bq-auth-card__header">
        <h2 className="bq-auth-card__title">Tizimga kirish</h2>
        <p className="bq-auth-card__subtitle">
          BirQidir platformasidagi shaxsiy kabinetingizga kiring
        </p>
      </div>

      {!isConfigured && (
        <div className="bq-auth-warning" role="alert">
          <AlertTriangle size={18} className="bq-auth-warning__icon" />
          <div className="bq-auth-warning__text">
            <strong>Firebase sozlanmagan:</strong>
            <p>
              Hozirda haqiqiy autentifikatsiya faol emas. Loyihaga o‘z Firebase kalitlaringizni
              qo‘shishingiz kerak (README.md dagi qo‘llanmaga qarang).
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

      <form className="bq-auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Elektron pochta"
          type="email"
          placeholder="nomingiz@misol.uz"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          error={errors.email}
          leftIcon={<Mail size={18} />}
          required
          autoComplete="email"
        />

        <Input
          label="Parol"
          type="password"
          placeholder="Parolingizni kiriting"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          error={errors.password}
          leftIcon={<Lock size={18} />}
          showPasswordToggle
          required
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight size={18} />}
          className="bq-auth-submit-btn"
        >
          {isConfigured ? 'Kirish' : 'Kirish (Firebase kutilmoqda)'}
        </Button>
      </form>

      <div className="bq-auth-card__footer">
        <p>
          Hali hisobingiz yo‘qmi?{' '}
          <Link to="/register" className="bq-auth-link">
            Ro‘yxatdan o‘tish
          </Link>
        </p>
      </div>
    </div>
  );
};
