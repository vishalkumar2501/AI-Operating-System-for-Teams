import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`
            w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-text
            placeholder:text-text-3
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-bg
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-semantic-danger' : 'border-border hover:border-border-strong'}
            ${className}
          `}
        />
        {error && <p className="text-xs text-semantic-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-text-3">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
