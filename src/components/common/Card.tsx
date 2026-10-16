import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'flat' | 'outline';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bq-card bq-card--${variant} bq-card--pad-${padding} ${
        hoverable ? 'bq-card--hoverable' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
