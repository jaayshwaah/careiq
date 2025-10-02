"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import EnhancedSidebar from '@/components/EnhancedSidebar';
import CommandPalette from '@/components/CommandPalette';
import StatusBar from '@/components/StatusBar';
import { cn } from '@/lib/utils';

interface EnhancedAppLayoutProps {
  children: React.ReactNode;
}

const EnhancedAppLayout: React.FC<EnhancedAppLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Handle ⌘K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateChat = () => {
    // This will be handled by the sidebar component
    setCommandPaletteOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-12 h-12 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <span className="text-white font-bold text-xl">CIQ</span>
          </motion.div>
          <motion.div
            className="text-primary font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading CareIQ...
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-[var(--bg)] flex overflow-hidden">
      {/* Skip Links for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>
      {/* Sidebar */}
      <nav id="navigation" aria-label="Main navigation">
        <EnhancedSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="z-[var(--z-sticky)]"
        />
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Status Bar */}
        <StatusBar />

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          <motion.div
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCreateChat={handleCreateChat}
      />

      {/* Global Keyboard Shortcuts Hint */}
      <AnimatePresence>
        {!commandPaletteOpen && (
          <motion.div
            className="fixed bottom-4 right-4 z-[var(--z-tooltip)]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              onClick={() => setCommandPaletteOpen(true)}
              className="glass-card p-3 text-primary hover:bg-[var(--glass-bg)]/90 transition-standard focus-ring"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Open Command Palette (⌘K)"
            >
              <div className="flex items-center gap-2 text-sm">
                <kbd className="px-2 py-1 bg-[var(--muted)] rounded text-primary text-xs">⌘</kbd>
                <kbd className="px-2 py-1 bg-[var(--muted)] rounded text-primary text-xs">K</kbd>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedAppLayout;
