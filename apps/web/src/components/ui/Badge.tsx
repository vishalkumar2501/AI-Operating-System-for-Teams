type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  destructive: 'bg-red-500/15 text-red-400 border-red-500/30',
  default: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
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
