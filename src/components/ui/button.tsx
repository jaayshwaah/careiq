"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-standard focus-ring touch-target disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] shadow-soft",
      secondary: "bg-[var(--bg-elev)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--muted)]",
      ghost: "text-[var(--text-primary)] hover:bg-[var(--muted)]",
      danger: "bg-[var(--err)] text-white hover:bg-[var(--err)]/90 shadow-soft",
      glass: "glass-card text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/90"
    };

    const sizes = {
      sm: "h-8 px-3 text-sm rounded-[var(--radius-sm)]",
      md: "h-10 px-4 text-base rounded-[var(--radius-md)]",
      lg: "h-12 px-6 text-lg rounded-[var(--radius-lg)]"
    };

    const widthClasses = fullWidth ? "w-full" : "";

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          widthClasses,
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.1 }}
        {...props}
      >
        {loading && (
          <motion.div
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };