import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  showPasswordToggle,
  type = 'text',
  id,
  className = '',
  required,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId =
    id ||
    (label
      ? `input-${label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')}`
      : undefined);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`bq-input-wrapper ${error ? 'bq-input-wrapper--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="bq-input__label">
          {label} {required && <span className="bq-input__required">*</span>}
        </label>
      )}

      <div className="bq-input__container">
        {leftIcon && <span className="bq-input__left-icon">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={`bq-input ${leftIcon ? 'bq-input--has-left-icon' : ''} ${
            isPassword || showPasswordToggle ? 'bq-input--has-right-icon' : ''
          }`}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            className="bq-input__toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="bq-input__error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="bq-input__helper">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
