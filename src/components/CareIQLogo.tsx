// src/components/CareIQLogo.tsx - Logo component
"use client";

import React from 'react';

interface CareIQLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg'
};

export default function CareIQLogo({ 
  size = 'md', 
  className = '', 
  showText = false 
}: CareIQLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`
        ${sizeClasses[size]} 
        bg-gradient-to-br from-blue-600 to-blue-700 
        rounded-lg flex items-center justify-center 
        text-white font-bold shadow-sm
      `}>
        <span>CIQ</span>
      </div>
      
      {/* Optional text */}
      {showText && (
        <span className="font-semibold text-gray-900 dark:text-white">
          CareIQ
        </span>
      )}
    </div>
  );
}

// Alternative version with a more sophisticated icon
export function CareIQLogoAdvanced({ 
  size = 'md', 
  className = '', 
  showText = false 
}: CareIQLogoProps) {
  const iconSize = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* SVG Logo Icon */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="rounded-lg"
        >
          {/* Background */}
          <rect width="32" height="32" rx="6" fill="url(#gradient)" />
          
          {/* Heart/Care symbol */}
          <path
            d="M16 24c-1.5-1.5-6-4.5-6-9 0-2.5 2-4.5 4.5-4.5 1.5 0 1.5 1 1.5 1s0-1 1.5-1c2.5 0 4.5 2 4.5 4.5 0 4.5-4.5 7.5-6 9z"
            fill="white"
            opacity="0.9"
          />
          
          {/* Plus/Medical symbol */}
          <rect x="14" y="8" width="4" height="2" rx="1" fill="white" opacity="0.7" />
          <rect x="15" y="7" width="2" height="4" rx="1" fill="white" opacity="0.7" />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Optional text */}
      {showText && (
        <span className="font-semibold text-gray-900 dark:text-white">
          CareIQ
        </span>
      )}
    </div>
  );
}

// Simple text-only version
export function CareIQTextLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`font-bold text-2xl ${className}`}>
      <span className="text-blue-600">Care</span>
      <span className="text-gray-900 dark:text-white">IQ</span>
    </div>
  );
}