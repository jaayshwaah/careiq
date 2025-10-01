"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant = 'default',
    padding = 'md',
    interactive = false,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = "rounded-[var(--radius-lg)] transition-standard";
    
    const variants = {
      default: "bg-[var(--card)] border border-[var(--border)]",
      glass: "glass-card",
      elevated: "bg-[var(--card)] shadow-[var(--shadow-soft)]",
      outlined: "bg-[var(--card)] border-2 border-[var(--border)]"
    };

    const paddings = {
      none: "p-0",
      sm: "p-3",
      md: "p-6",
      lg: "p-8"
    };

    const interactiveClasses = interactive 
      ? "hover:shadow-[var(--shadow-popover)] cursor-pointer" 
      : "";

    const MotionCard = motion.div;

    return (
      <MotionCard
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          interactiveClasses,
          className
        )}
        whileHover={interactive ? { scale: 1.01 } : undefined}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </MotionCard>
    );
  }
);

Card.displayName = "Card";

// Card sub-components
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
