import { useState } from 'react';

type OtterMascotProps = {
  variant?: 'sm' | 'md' | 'lg';
  decorative?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  sm: 'otter-mascot-sm',
  md: 'otter-mascot-md',
  lg: 'otter-mascot-lg',
};

export function OtterMascot({ variant = 'md', decorative = false, className = '' }: OtterMascotProps) {
  const [failed, setFailed] = useState(false);
  const classes = ['otter-mascot', SIZE_CLASS[variant], className].filter(Boolean).join(' ');

  if (failed) {
    return (
      <div className={`${classes} otter-mascot-fallback`} aria-hidden={decorative}>
        쑤
      </div>
    );
  }

  return (
    <img
      className={classes}
      src="/images/otter-health-teacher.png"
      alt={decorative ? '' : '쑤캥T 보건실 수달 캐릭터'}
      aria-hidden={decorative}
      onError={() => setFailed(true)}
    />
  );
}
