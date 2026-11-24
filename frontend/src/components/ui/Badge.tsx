import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'default' | 'ai' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-semantic-success-subtle text-semantic-success border-semantic-success-border',
  warning: 'bg-semantic-warning-subtle text-semantic-warning border-semantic-warning-border',
  info: 'bg-semantic-info-subtle text-semantic-info border-semantic-info-border',
  destructive: 'bg-semantic-danger-subtle text-semantic-danger border-semantic-danger-border',
  default: 'bg-surface-3 text-text-2 border-border',
  ai: 'bg-ai-bg text-ai-text border-ai-border font-semibold',
  accent: 'bg-accent-subtle text-accent border-accent/25 font-semibold',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
export default Badge;
