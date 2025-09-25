import React from 'react';
import { cn } from '@/lib/utils';

export interface PremiumProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPercentage?: boolean;
  animated?: boolean;
  shimmer?: boolean;
  label?: string;
}

const PremiumProgress = React.forwardRef<HTMLDivElement, PremiumProgressProps>(
  ({
    className,
    value,
    max = 100,
    variant = 'primary',
    size = 'md',
    showPercentage = false,
    animated = true,
    shimmer = true,
    label,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const baseClasses = [
      'progress-premium relative overflow-hidden'
    ];

    const variants = {
      primary: 'bg-gradient-primary',
      secondary: 'bg-gradient-secondary',
      success: 'bg-gradient-to-r from-success to-success/80',
      warning: 'bg-gradient-to-r from-warning to-warning/80',
      error: 'bg-gradient-to-r from-error to-error/80'
    };

    const sizes = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
      xl: 'h-6'
    };

    const textSizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    };

    return (
      <div className="space-y-2" ref={ref} {...props}>
        {(label || showPercentage) && (
          <div className="flex justify-between items-center">
            {label && (
              <span className={cn('font-medium text-slate-700', textSizes[size])}>
                {label}
              </span>
            )}
            {showPercentage && (
              <span className={cn('font-semibold text-slate-600', textSizes[size])}>
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            baseClasses,
            sizes[size],
            className
          )}
        >
          <div
            className={cn(
              'h-full rounded-lg transition-all duration-1000 ease-out relative overflow-hidden',
              variants[variant],
              animated && 'animate-fade-up'
            )}
            style={{
              width: `${percentage}%`,
              transitionDelay: animated ? '200ms' : '0ms'
            }}
          >
            {/* Shimmer effect */}
            {shimmer && percentage > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}

            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-lg" />
          </div>

          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 opacity-50 rounded-lg" />
        </div>

        {/* Value indicators for better UX */}
        {size === 'xl' && (
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    );
  }
);

PremiumProgress.displayName = 'PremiumProgress';

export { PremiumProgress };