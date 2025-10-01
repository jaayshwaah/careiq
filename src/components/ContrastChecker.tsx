"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  color: string;
  backgroundColor: string;
}

const ContrastChecker: React.FC = () => {
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate contrast ratio between two colors
  const getContrastRatio = (color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Apply gamma correction
      const gammaCorrect = (c: number) => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

      return 0.2126 * gammaCorrect(r) + 0.7152 * gammaCorrect(g) + 0.0722 * gammaCorrect(b);
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Convert OKLCH to hex for contrast calculation
  const oklchToHex = (oklch: string): string => {
    // This is a simplified conversion - in production you'd use a proper color library
    const match = oklch.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/);
    if (!match) return '#000000';
    
    const [, l, c, h] = match.map(Number);
    
    // Convert OKLCH to RGB (simplified)
    const lNorm = l * 100;
    const cNorm = c * 100;
    const hNorm = h;
    
    // This is a very basic conversion - real implementation would be more complex
    const r = Math.round(Math.min(255, Math.max(0, lNorm + cNorm * Math.cos(hNorm * Math.PI / 180))));
    const g = Math.round(Math.min(255, Math.max(0, lNorm + cNorm * Math.cos((hNorm - 120) * Math.PI / 180))));
    const b = Math.round(Math.min(255, Math.max(0, lNorm + cNorm * Math.cos((hNorm - 240) * Math.PI / 180))));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const checkContrast = () => {
    const checks = [
      {
        name: 'Primary Text on Light Background',
        text: 'oklch(0.15 0.01 240)',
        background: 'oklch(0.98 0.01 240)',
        expected: 7.1
      },
      {
        name: 'Secondary Text on Light Background',
        text: 'oklch(0.35 0.01 240)',
        background: 'oklch(0.98 0.01 240)',
        expected: 4.5
      },
      {
        name: 'Primary Text on Dark Background',
        text: 'oklch(0.95 0.01 240)',
        background: 'oklch(0.08 0.01 240)',
        expected: 7.1
      },
      {
        name: 'Secondary Text on Dark Background',
        text: 'oklch(0.80 0.01 240)',
        background: 'oklch(0.08 0.01 240)',
        expected: 4.5
      },
      {
        name: 'Text on Accent Background',
        text: 'oklch(0.98 0.01 240)',
        background: 'oklch(0.55 0.22 250)',
        expected: 4.5
      },
      {
        name: 'Status Text on Status Background',
        text: 'oklch(0.98 0.01 240)',
        background: 'oklch(0.55 0.15 140)',
        expected: 4.5
      }
    ];

    const newResults = checks.map(check => {
      const textHex = oklchToHex(check.text);
      const bgHex = oklchToHex(check.background);
      const ratio = getContrastRatio(textHex, bgHex);
      
      let level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
      if (ratio >= 7) level = 'AAA';
      else if (ratio >= 4.5) level = 'AA';
      else if (ratio >= 3) level = 'AA Large';
      else level = 'Fail';

      return {
        ratio: Math.round(ratio * 100) / 100,
        level,
        color: textHex,
        backgroundColor: bgHex
      };
    });

    setResults(newResults);
  };

  useEffect(() => {
    checkContrast();
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'AAA': return 'text-green-600';
      case 'AA': return 'text-blue-600';
      case 'AA Large': return 'text-yellow-600';
      case 'Fail': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-[var(--accent)] text-white px-4 py-2 rounded-lg shadow-lg hover:bg-[var(--accent-hover)] transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Check Contrast
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border max-w-md max-h-96 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary">Contrast Checker</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted hover:text-primary"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: result.backgroundColor }}
              />
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: result.color }}
              />
              <span className="text-sm text-primary">
                {result.ratio}:1
              </span>
            </div>
            <span className={`text-sm font-medium ${getLevelColor(result.level)}`}>
              {result.level}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-muted">
        <p>WCAG Guidelines:</p>
        <p>• AAA: 7:1+ (Enhanced)</p>
        <p>• AA: 4.5:1+ (Standard)</p>
        <p>• AA Large: 3:1+ (Large text)</p>
      </div>
    </motion.div>
  );
};

export default ContrastChecker;
