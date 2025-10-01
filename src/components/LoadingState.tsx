"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  variant = 'spinner',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderSpinner = () => (
    <motion.div
      className={cn(
        "border-2 border-[var(--muted)] border-t-[var(--accent)] rounded-full",
        sizeClasses[size]
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "bg-[var(--accent)] rounded-full",
            size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <motion.div
      className={cn(
        "bg-[var(--accent)] rounded-full",
        sizeClasses[size]
      )}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1,
        repeat: Infinity
      }}
    />
  );

  const renderSkeleton = () => (
    <div className="space-y-2 w-full">
      <div className="h-4 bg-[var(--muted)] rounded animate-pulse" />
      <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-3/4" />
      <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/2" />
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      {variant !== 'skeleton' && renderLoader()}
      {variant === 'skeleton' && renderLoader()}
      {message && (
        <motion.p
          className={cn("text-muted", textSizeClasses[size])}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingState;
