import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Select({ id, label, error, hint, className = '', children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const description = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-foreground">{label}</label>}
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description ? descriptionId : props['aria-describedby']}
        className={`min-h-10 w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${error ? 'border-error' : ''} ${className}`}
      >
        {children}
      </select>
      {description && (
        <p id={descriptionId} className={`text-sm ${error ? 'text-error' : 'text-muted'}`} role={error ? 'alert' : undefined}>
          {description}
        </p>
      )}
    </div>
  );
}
