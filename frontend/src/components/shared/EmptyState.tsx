import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface-raised px-6 py-10 text-center">
      {Icon && <Icon size={28} aria-hidden="true" className="mx-auto mb-3 text-muted" />}
      <h2 className="font-semibold text-foreground">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
