import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent' | 'ai';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:opacity-90 active:opacity-100 focus-visible:ring-ring font-semibold shadow-sm',
  secondary:
    'bg-surface-2 text-text hover:bg-surface-3 focus-visible:ring-ring border border-border',
  ghost:
    'bg-transparent text-text-2 hover:bg-surface-2 hover:text-text focus-visible:ring-ring',
  destructive:
    'bg-semantic-danger-subtle text-semantic-danger hover:bg-semantic-danger/20 border border-semantic-danger-border focus-visible:ring-semantic-danger',
  accent:
    'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed focus-visible:ring-ring font-semibold shadow-sm',
  ai:
    'bg-ai-bg text-ai-text hover:bg-accent-hover border border-ai-border font-semibold shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? isLoading}
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        disabled:cursor-not-allowed disabled:opacity-50
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
}
export default Button;
