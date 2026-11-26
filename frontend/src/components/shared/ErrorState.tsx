import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export default function ErrorState({ title = 'Không thể tải dữ liệu', message, action }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-card border border-error/30 bg-error/5 p-5 text-error">
      <div className="flex items-start gap-3">
        <CircleAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
