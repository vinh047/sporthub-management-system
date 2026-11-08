import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  interactive?: boolean;
}

export default function Card({ children, className = '', interactive = false, ...props }: CardProps) {
  return (
    <section
      {...props}
      className={`rounded-card border border-border bg-surface-raised ${interactive ? 'transition-shadow hover:shadow-design-sm' : ''} ${className}`}
    >
      {children}
    </section>
  );
}
