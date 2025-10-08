"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Menu, 
  X, 
  Search, 
  Plus, 
  Home, 
  MessageCircle, 
  Shield, 
  ClipboardList,
  FileText,
  BookOpen,
  Package,
  BarChart3,
  Zap,
  ExternalLink,
  Settings,
  Users,
  Building2,
  Workflow,
  Calculator,
  CheckSquare,
  FileSpreadsheet,
  ListTodo,
  Truck,
  ChevronRight,
  ChevronDown,
  Bell,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  adminOnly?: boolean;
  children?: NavigationItem[];
}

const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({ children }) => {
  const { userProfile, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTabletMode, setIsTabletMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsTabletMode(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const navigationItems: NavigationItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat Assistant", icon: MessageCircle },
    { href: "/compliance", label: "Compliance & Surveys", icon: Shield },
    { href: "/daily-rounds", label: "Daily Rounds", icon: ClipboardList },
    { href: "/care-plans", label: "Care Planning", icon: FileText },
    { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "/supply", label: "Supply & Inventory", icon: Package },
    { href: "/analytics", label: "Analytics & Reports", icon: BarChart3 },
    { href: "/workflows", label: "Workflows", icon: Zap },
    { href: "/integrations", label: "Integrations", icon: ExternalLink },
  ];

  const toolsItems: NavigationItem[] = [
    { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
    { href: "/survey-prep", label: "Survey Prep", icon: CheckSquare },
    { href: "/pbj-corrector-ai", label: "PBJ Corrector", icon: FileSpreadsheet },
    { href: "/task-management", label: "Task Management", icon: ListTodo },
    { href: "/supplier-management", label: "Supplier Management", icon: Truck, adminOnly: true },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const adminItems: NavigationItem[] = [
    { href: "/admin", label: "Admin Dashboard", icon: Settings },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/facilities", label: "Facility Settings", icon: Building2 },
    { href: "/admin/workflow-designer", label: "Workflow Designer", icon: Workflow },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const NavigationSection = ({ 
    items, 
    title, 
    sectionKey 
  }: { 
    items: NavigationItem[], 
    title: string,
    sectionKey: string
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    const filteredItems = items.filter(item => 
      !item.adminOnly || userProfile?.role?.includes('administrator')
    );

    if (filteredItems.length === 0) return null;

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-[var(--muted)] rounded-[var(--radius-md)] transition-standard"
        >
          <span>{title}</span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1 ml-4"
            >
              {filteredItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-[var(--muted)] rounded-[var(--radius-md)] transition-standard"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon size={18} className="text-muted" />
                  {item.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-[var(--bg)] flex flex-col">
      {/* Mobile Header */}
      <div className="glass border-b border-[var(--glass-border)] p-4 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">CIQ</span>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">
              CareIQ
            </div>
            <div className="text-xs text-muted">
              AI-Powered Operations
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>

      {/* Tablet Header */}
      {isTabletMode && (
        <div className="glass border-b border-[var(--glass-border)] p-4 hidden md:block lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">CIQ</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-primary">
                  CareIQ
                </div>
                <div className="text-xs text-muted">
                  AI-Powered Operations
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Search size={16} />}
              >
                Search
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus size={16} />}
              >
                New
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="fixed inset-0 z-[var(--z-modal)] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Menu Panel */}
              <motion.div
                className="absolute left-0 top-0 h-full w-80 glass border-r border-[var(--glass-border)]"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="p-4 border-b border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">CIQ</span>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-primary">
                          CareIQ
                        </div>
                        <div className="text-xs text-muted">
                          AI-Powered Operations
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <Input
                    placeholder="Search..."
                    leftIcon={<Search size={16} />}
                    className="mb-4"
                  />
                </div>

                {/* Navigation */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                  <NavigationSection
                    items={navigationItems}
                    title="Main Navigation"
                    sectionKey="main"
                  />
                  
                  <NavigationSection
                    items={toolsItems}
                    title="Tools"
                    sectionKey="tools"
                  />
                  
                  {userProfile?.role?.includes('administrator') && (
                    <NavigationSection
                      items={adminItems}
                      title="Administration"
                      sectionKey="admin"
                    />
                  )}
                </div>

                {/* User Section */}
                <div className="p-4 border-t border-[var(--glass-border)] glass">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary truncate">
                        {userProfile?.full_name || 'User'}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {userProfile?.role || 'Member'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="min-h-full">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="glass border-t border-[var(--glass-border)] p-2 lg:hidden">
        <div className="flex items-center justify-around">
          {[
            { href: "/", icon: Home, label: "Home" },
            { href: "/chat", icon: MessageCircle, label: "Chat" },
            { href: "/daily-ops", icon: ClipboardList, label: "Ops" },
            { href: "/compliance", icon: Shield, label: "Compliance" },
            { href: "/analytics", icon: BarChart3, label: "Analytics" }
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 p-2 rounded-[var(--radius-md)] hover:bg-[var(--muted)]/50 transition-standard"
            >
              <item.icon size={20} className="text-muted" />
              <span className="text-xs text-muted">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizedLayout;