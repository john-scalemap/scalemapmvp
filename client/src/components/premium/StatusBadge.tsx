import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'excellent' | 'good' | 'warning' | 'critical' | 'analysis' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({
    className,
    variant,
    size = 'md',
    animated = false,
    icon,
    pulse = false,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center gap-2 font-semibold rounded-lg',
      'transition-all duration-300 relative overflow-hidden'
    ];

    const variants = {
      excellent: [
        'status-excellent text-white',
        animated && 'animate-scale-in'
      ],
      good: [
        'bg-gradient-to-r from-success/80 to-success text-white',
        'shadow-lg shadow-success/25',
        animated && 'animate-scale-in'
      ],
      warning: [
        'bg-gradient-to-r from-warning to-warning/80 text-white',
        'shadow-lg shadow-warning/25',
        animated && 'animate-scale-in'
      ],
      critical: [
        'status-critical text-white',
        animated && 'animate-scale-in'
      ],
      analysis: [
        'status-analysis text-white',
        animated && 'animate-pulse-shimmer'
      ],
      pending: [
        'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
        'shadow-lg shadow-slate/25',
        pulse && 'animate-pulse'
      ]
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {icon && (
          <span className={cn('flex-shrink-0', iconSizes[size])}>
            {icon}
          </span>
        )}

        <span>{children}</span>

        {/* Special effects for different variants */}
        {variant === 'analysis' && (
          <>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            {/* Pulsing dots */}
            <div className="flex gap-1 ml-2">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </>
        )}

        {variant === 'excellent' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
        )}

        {variant === 'critical' && pulse && (
          <div className="absolute -inset-1 bg-error/30 rounded-lg animate-ping" />
        )}
      </div>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };