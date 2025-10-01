"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    screenReader: false,
    keyboardNavigation: false,
  });

  // Detect user preferences
  useEffect(() => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    const updateFromMediaQueries = () => {
      setSettings(prev => ({
        ...prev,
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
      }));
    };

    updateFromMediaQueries();

    // Listen for changes
    mediaQueries.reducedMotion.addEventListener('change', updateFromMediaQueries);
    mediaQueries.highContrast.addEventListener('change', updateFromMediaQueries);

    return () => {
      mediaQueries.reducedMotion.removeEventListener('change', updateFromMediaQueries);
      mediaQueries.highContrast.removeEventListener('change', updateFromMediaQueries);
    };
  }, []);

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = 
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.navigator.userAgent.includes('VoiceOver') ||
        window.navigator.userAgent.includes('TalkBack') ||
        // Check for screen reader specific APIs
        'speechSynthesis' in window ||
        'speechRecognition' in window;

      setSettings(prev => ({
        ...prev,
        screenReader: hasScreenReader,
      }));
    };

    detectScreenReader();
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setSettings(prev => ({
          ...prev,
          keyboardNavigation: true,
        }));
      }
    };

    const handleMouseDown = () => {
      setSettings(prev => ({
        ...prev,
        keyboardNavigation: false,
      }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announceToScreenReader = (message: string) => {
    if (settings.screenReader) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  };

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--duration-fast', '0ms');
      root.style.setProperty('--duration-med', '0ms');
      root.style.setProperty('--duration-slow', '0ms');
    } else {
      root.style.removeProperty('--duration-fast');
      root.style.removeProperty('--duration-med');
      root.style.removeProperty('--duration-slow');
    }

    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size
    root.setAttribute('data-font-size', settings.fontSize);

    // Apply keyboard navigation focus styles
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [settings]);

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      announceToScreenReader,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
