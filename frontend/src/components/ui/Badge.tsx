import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface text-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
};

export default function Badge({ variant = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span {...props} className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
