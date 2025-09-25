import React from 'react';
import { cn } from '@/lib/utils';

export interface PremiumCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'executive' | 'glassmorphism' | 'elevated';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  glow?: boolean;
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    interactive = false,
    glow = false,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'rounded-2xl transition-all duration-300',
      interactive && 'cursor-pointer'
    ];

    const variants = {
      default: [
        'card-premium',
        interactive && 'hover:card-premium-hover'
      ],
      executive: [
        'card-executive',
        interactive && 'hover:shadow-premium-lg hover:-translate-y-1'
      ],
      glassmorphism: [
        'glass-effect shadow-glass',
        interactive && 'hover:glass-effect-hover hover:-translate-y-2'
      ],
      elevated: [
        'bg-white shadow-premium-xl border border-slate-200/50',
        interactive && 'hover:shadow-premium-xl hover:-translate-y-3 hover:border-primary/20'
      ]
    };

    const sizes = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    };

    const glowEffect = glow ? 'premium-glow-purple' : '';

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          glowEffect,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}

        {/* Premium accent border for executive variant */}
        {variant === 'executive' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}

        {/* Glassmorphism inner glow */}
        {variant === 'glassmorphism' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-primary/5 pointer-events-none" />
        )}
      </div>
    );
  }
);

PremiumCard.displayName = 'PremiumCard';

export { PremiumCard };