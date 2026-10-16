import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`bq-btn bq-btn--${variant} bq-btn--${size} ${isLoading ? 'bq-btn--loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="bq-btn__spinner" aria-hidden="true" />
      )}
      {!isLoading && leftIcon && <span className="bq-btn__icon-left">{leftIcon}</span>}
      <span className="bq-btn__text">{children}</span>
      {!isLoading && rightIcon && <span className="bq-btn__icon-right">{rightIcon}</span>}
    </button>
  );
};
