"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Breakpoint {
  name: string;
  min: number;
  max?: number;
}

interface ResponsiveContextType {
  currentBreakpoint: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

interface ResponsiveProviderProps {
  children: React.ReactNode;
}

const breakpoints: Breakpoint[] = [
  { name: 'mobile', min: 0, max: 767 },
  { name: 'tablet', min: 768, max: 1023 },
  { name: 'desktop', min: 1024, max: 1439 },
  { name: 'large-desktop', min: 1440 },
];

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenWidth(width);
      setScreenHeight(height);
      setOrientation(width > height ? 'landscape' : 'portrait');

      // Determine current breakpoint
      const breakpoint = breakpoints.find(bp => 
        width >= bp.min && (bp.max === undefined || width <= bp.max)
      );
      
      if (breakpoint) {
        setCurrentBreakpoint(breakpoint.name);
      }
    };

    // Initial update
    updateDimensions();

    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  const isMobile = currentBreakpoint === 'mobile';
  const isTablet = currentBreakpoint === 'tablet';
  const isDesktop = currentBreakpoint === 'desktop';
  const isLargeDesktop = currentBreakpoint === 'large-desktop';

  return (
    <ResponsiveContext.Provider value={{
      currentBreakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isLargeDesktop,
      screenWidth,
      screenHeight,
      orientation,
    }}>
      {children}
    </ResponsiveContext.Provider>
  );
};
