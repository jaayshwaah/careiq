"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface PerformanceMetrics {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  loadTime: number | null;
  memoryUsage: number | null;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = true,
  onMetricsUpdate
}) => {
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    loadTime: null,
    memoryUsage: null
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const measurePerformance = () => {
      const newMetrics: PerformanceMetrics = { ...metrics };

      // Measure Core Web Vitals
      if ('PerformanceObserver' in window) {
        // LCP - Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          newMetrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FID - First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            newMetrics.fid = (entry as any).processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS - Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          newMetrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // FCP - First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              newMetrics.fcp = entry.startTime;
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      }

      // TTFB - Time to First Byte
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        newMetrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        newMetrics.loadTime = navigationEntry.loadEventEnd - navigationEntry.navigationStart;
      }

      // Memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        newMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);

      // Send metrics to analytics endpoint
      sendMetricsToAnalytics(newMetrics);
    };

    const sendMetricsToAnalytics = async (metrics: PerformanceMetrics) => {
      try {
        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userProfile?.id,
            facilityId: userProfile?.facility_id,
            metrics,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        });
      } catch (error) {
        console.error('Failed to send performance metrics:', error);
      }
    };

    // Measure performance after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Measure performance on route changes
    const handleRouteChange = () => {
      setTimeout(measurePerformance, 1000);
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('load', measurePerformance);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [enabled, userProfile, onMetricsUpdate]);

  // Don't render anything - this is a monitoring component
  return null;
};

export default PerformanceMonitor;
