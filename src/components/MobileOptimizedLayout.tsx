"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User, 
  Settings,
  ChevronDown,
  ChevronUp,
  Home,
  MessageSquare,
  BarChart3,
  Calendar,
  Package,
  Shield,
  FileText,
  Calculator,
  CheckSquare,
  ListTodo,
  Workflow,
  Truck,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
}

const mainNavigationItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const toolsNavigationItems = [
  { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
  { href: "/daily-rounds", label: "Daily Rounds", icon: CheckSquare },
  { href: "/task-management", label: "Task Management", icon: ListTodo },
  { href: "/admin/workflow-designer", label: "Workflow Designer", icon: Workflow, adminOnly: true },
  { href: "/survey-prep", label: "Survey Prep", icon: Shield },
  { href: "/pbj-corrector-ai", label: "PBJ Corrector AI", icon: FileText },
  { href: "/supply-management", label: "Supply Management", icon: Package },
  { href: "/supplier-management", label: "Supplier Management", icon: Truck, adminOnly: true },
  { href: "/calendar-integrations", label: "Calendar", icon: Calendar },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, adminOnly: true },
];

export default function MobileOptimizedLayout({ children }: MobileOptimizedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const isCurrentPath = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/chat");
    }
    return pathname.startsWith(href);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">CareIQ</h1>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-900">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Main Navigation */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Main
                  </h3>
                  <nav className="space-y-1">
                    {mainNavigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isCurrentPath(item.href);
                      
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </a>
                      );
                    })}
                  </nav>
                </div>

                {/* Tools Navigation */}
                <div>
                  <button
                    onClick={() => toggleSection('tools')}
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
                  >
                    <span>Tools</span>
                    {activeSection === 'tools' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  
                  {activeSection === 'tools' && (
                    <nav className="space-y-1">
                      {toolsNavigationItems.map((item) => {
                        // Hide admin-only items for non-admin users
                        if (item.adminOnly && !user?.role?.includes('administrator')) {
                          return null;
                        }
                        
                        const Icon = item.icon;
                        const isActive = isCurrentPath(item.href);
                        
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </a>
                        );
                      })}
                    </nav>
                  )}
                </div>

                {/* User Section */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.role || 'User'}
                      </p>
                    </div>
                    <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </div>
    );
  }

  // Desktop layout (existing layout)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}
