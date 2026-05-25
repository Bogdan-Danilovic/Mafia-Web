'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-violet-600 text-white glow-violet-sm hover:bg-violet-500 active:bg-violet-700',
  secondary:
    'bg-transparent text-violet-400 border border-violet-500/40 hover:border-violet-400 hover:text-violet-300 active:bg-violet-500/10',
  danger:
    'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:text-red-300 active:bg-red-600/40',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 active:bg-white/10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide
          transition-colors duration-150 min-h-[44px]
          disabled:opacity-40 disabled:pointer-events-none
          focus-visible:outline-2 focus-visible:outline-violet-500/70 focus-visible:outline-offset-2
          ${variants[variant]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
