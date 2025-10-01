"use client";

import React, { Suspense, lazy, ComponentType } from 'react';
import { motion } from 'framer-motion';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
  className?: string;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <motion.div
      className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <DefaultFallback />,
  minHeight = "200px",
  className = ""
}) => {
  return (
    <div className={className} style={{ minHeight }}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
};

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: T) {
    return (
      <LazyWrapper fallback={fallback}>
        <Component {...props} />
      </LazyWrapper>
    );
  };
}

// Lazy load heavy components
export const LazyChart = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
export const LazyCalendar = lazy(() => import('@/components/Calendar'));
export const LazyDataTable = lazy(() => import('@/components/DataTable'));
export const LazyFileUpload = lazy(() => import('@/components/FileUpload'));
export const LazyAdvancedAnalytics = lazy(() => import('@/components/AdvancedAnalytics'));

export default LazyWrapper;
