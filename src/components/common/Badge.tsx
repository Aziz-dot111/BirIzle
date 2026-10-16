import React from 'react';
import './Badge.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gray' | 'amber' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'green',
  size = 'md',
  icon,
  className = '',
}) => {
  return (
    <span className={`bq-badge bq-badge--${variant} bq-badge--${size} ${className}`}>
      {icon && <span className="bq-badge__icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
