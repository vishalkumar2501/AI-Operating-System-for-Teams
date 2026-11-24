interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function getAvatarStyle(name?: string | null): string {
  const styles = [
    'bg-surface-3 text-text border border-border-strong',
    'bg-semantic-info-subtle text-semantic-info border border-semantic-info-border',
    'bg-semantic-success-subtle text-semantic-success border border-semantic-success-border',
    'bg-semantic-warning-subtle text-semantic-warning border border-semantic-warning-border',
    'bg-accent-subtle text-accent border border-accent/30',
  ];
  if (!name) return styles[0];
  const idx = name.charCodeAt(0) % styles.length;
  return styles[idx];
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${getAvatarStyle(name)} flex items-center justify-center rounded-full font-semibold ring-1 ring-border ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
export default Avatar;
