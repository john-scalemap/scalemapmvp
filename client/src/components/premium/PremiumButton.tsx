import React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    asChild = false,
    loading = false,
    icon,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : 'button';

    const baseClasses = [
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300',
      'focus:outline-none focus:ring-4 focus:ring-primary/20',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden'
    ];

    const variants = {
      primary: [
        'btn-primary-gradient text-white shadow-premium',
        'hover:shadow-premium-lg hover:-translate-y-1',
        'active:translate-y-0 active:shadow-premium',
        'focus:ring-primary/30'
      ],
      secondary: [
        'btn-secondary-premium text-primary-700',
        'hover:bg-primary/5 hover:border-primary/30',
        'focus:ring-primary/20'
      ],
      ghost: [
        'bg-transparent text-slate-600 hover:bg-slate-100/80',
        'hover:text-slate-800 backdrop-blur-sm',
        'focus:ring-slate/20'
      ],
      outline: [
        'border-2 border-primary/20 text-primary-700 bg-transparent',
        'hover:bg-primary/5 hover:border-primary/40',
        'focus:ring-primary/20'
      ]
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm rounded-lg',
      md: 'px-6 py-3 text-base rounded-xl',
      lg: 'px-8 py-4 text-lg rounded-xl',
      xl: 'px-10 py-5 text-xl rounded-2xl'
    };

    return (
      <Comp
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          </div>
        )}

        {icon && !loading && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}

        <span className={cn(loading && 'invisible')}>
          {children}
        </span>

        {/* Shimmer effect for primary variant */}
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        )}
      </Comp>
    );
  }
);

PremiumButton.displayName = 'PremiumButton';

export { PremiumButton };