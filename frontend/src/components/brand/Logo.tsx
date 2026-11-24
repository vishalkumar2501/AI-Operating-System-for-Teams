import { useTheme } from '@/store/theme.store';

export interface LogoProps {
  variant?: 'mark' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const { isDark } = useTheme();

  // Size dimensions
  // mark: aspect ratio ~251:266 (~0.94)
  // full: aspect ratio ~190:56 (~3.39)
  let height = 28;
  if (typeof size === 'number') {
    height = size;
  } else if (size === 'xs') {
    height = 20;
  } else if (size === 'sm') {
    height = 24;
  } else if (size === 'md') {
    height = 28;
  } else if (size === 'lg') {
    height = 36;
  }

  if (variant === 'mark') {
    const width = Math.round((height * 251) / 266);
    return (
      <img
        src="/brand/logo-mark.svg"
        alt="TeamOS"
        width={width}
        height={height}
        style={{ height: `${height}px`, width: `${width}px` }}
        className={`shrink-0 select-none ${className}`}
        loading="eager"
      />
    );
  }

  const width = Math.round((height * 190) / 56);
  const src = isDark ? '/brand/logo-full-dark.svg' : '/brand/logo-full-light.svg';

  return (
    <img
      src={src}
      alt="TeamOS"
      width={width}
      height={height}
      style={{ height: `${height}px`, width: `${width}px` }}
      className={`shrink-0 select-none ${className}`}
      loading="eager"
    />
  );
}
export default Logo;
