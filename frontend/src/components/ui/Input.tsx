import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ id, label, error, hint, className = '', ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const description = error ?? hint;

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-foreground">{label}</label>}
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description ? descriptionId : props['aria-describedby']}
        className={`min-h-10 w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${error ? 'border-error' : ''} ${className}`}
      />
      {description && (
        <p id={descriptionId} className={`text-sm ${error ? 'text-error' : 'text-muted'}`} role={error ? 'alert' : undefined}>
          {description}
        </p>
      )}
    </div>
  );
}
