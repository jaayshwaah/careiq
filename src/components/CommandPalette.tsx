"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  MessageCircle, 
  Home, 
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
  Plus,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href?: string;
  action?: () => void;
  category: string;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat?: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  onCreateChat 
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'home', title: 'Go to Home', description: 'Dashboard and overview', icon: Home, href: '/', category: 'Navigate', keywords: ['home', 'dashboard', 'overview'] },
    { id: 'chat', title: 'Open Chat Assistant', description: 'AI-powered conversation', icon: MessageCircle, href: '/chat', category: 'Navigate', keywords: ['chat', 'ai', 'assistant', 'conversation'] },
    { id: 'compliance', title: 'Compliance & Surveys', description: 'CMS regulations and survey prep', icon: Shield, href: '/compliance', category: 'Navigate', keywords: ['compliance', 'surveys', 'cms', 'regulations'] },
    { id: 'daily-ops', title: 'Daily Operations', description: 'Rounds, PPD, census, incidents', icon: ClipboardList, href: '/daily-ops', category: 'Navigate', keywords: ['daily', 'operations', 'rounds', 'ppd', 'census'] },
    { id: 'care-plans', title: 'Care Planning', description: 'AI-assisted care plan creation', icon: FileText, href: '/care-plans', category: 'Navigate', keywords: ['care', 'plans', 'planning', 'documentation'] },
    { id: 'knowledge', title: 'Knowledge Base', description: 'Policies, procedures, and resources', icon: BookOpen, href: '/knowledge', category: 'Navigate', keywords: ['knowledge', 'policies', 'procedures', 'resources'] },
    { id: 'supply', title: 'Supply & Inventory', description: 'Inventory management and tracking', icon: Package, href: '/supply', category: 'Navigate', keywords: ['supply', 'inventory', 'tracking', 'management'] },
    { id: 'analytics', title: 'Analytics & Reports', description: 'Performance metrics and reporting', icon: BarChart3, href: '/analytics', category: 'Navigate', keywords: ['analytics', 'reports', 'metrics', 'performance'] },
    { id: 'workflows', title: 'Workflows', description: 'Automation builder and templates', icon: Zap, href: '/workflows', category: 'Navigate', keywords: ['workflows', 'automation', 'templates', 'builder'] },
    { id: 'integrations', title: 'Integrations', description: 'External system connections', icon: ExternalLink, href: '/integrations', category: 'Navigate', keywords: ['integrations', 'connections', 'external', 'sync'] },

    // Create Actions
    { id: 'new-chat', title: 'Start New Chat', description: 'Begin a new conversation', icon: Plus, action: onCreateChat, category: 'Create', keywords: ['new', 'chat', 'conversation', 'start'] },
    { id: 'new-task', title: 'Create Task', description: 'Add a new task or assignment', icon: ListTodo, href: '/task-management?action=create', category: 'Create', keywords: ['new', 'task', 'create', 'assignment'] },
    { id: 'new-round', title: 'Start Daily Round', description: 'Begin digital rounding process', icon: ClipboardList, href: '/daily-ops?action=round', category: 'Create', keywords: ['new', 'round', 'daily', 'rounding'] },
    { id: 'new-incident', title: 'Report Incident', description: 'Create incident report', icon: FileText, href: '/daily-ops?action=incident', category: 'Create', keywords: ['new', 'incident', 'report', 'create'] },

    // Tools
    { id: 'ppd-calc', title: 'PPD Calculator', description: 'Calculate per-patient-day staffing', icon: Calculator, href: '/ppd-calculator', category: 'Tools', keywords: ['ppd', 'calculator', 'staffing', 'calculate'] },
    { id: 'survey-prep', title: 'Survey Preparation', description: 'Mock survey and readiness assessment', icon: CheckSquare, href: '/survey-prep', category: 'Tools', keywords: ['survey', 'prep', 'mock', 'assessment'] },
    { id: 'pbj-corrector', title: 'PBJ Corrector', description: 'Fix and format PBJ XML files', icon: FileSpreadsheet, href: '/pbj-corrector-ai', category: 'Tools', keywords: ['pbj', 'corrector', 'xml', 'format'] },

    // Admin
    { id: 'admin', title: 'Admin Dashboard', description: 'System administration', icon: Settings, href: '/admin', category: 'Admin', keywords: ['admin', 'dashboard', 'administration'] },
    { id: 'users', title: 'User Management', description: 'Manage users and roles', icon: Users, href: '/admin/users', category: 'Admin', keywords: ['users', 'management', 'roles', 'permissions'] },
    { id: 'facilities', title: 'Facility Settings', description: 'Configure facility settings', icon: Building2, href: '/admin/facilities', category: 'Admin', keywords: ['facility', 'settings', 'configure'] },
    { id: 'workflow-designer', title: 'Workflow Designer', description: 'Create automation workflows', icon: Workflow, href: '/admin/workflow-designer', category: 'Admin', keywords: ['workflow', 'designer', 'automation', 'create'] },
  ];

  const filteredCommands = commands.filter(command => {
    const searchTerms = query.toLowerCase().split(' ');
    return searchTerms.every(term => 
      command.title.toLowerCase().includes(term) ||
      command.description.toLowerCase().includes(term) ||
      command.keywords.some(keyword => keyword.includes(term))
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedCommand = filteredCommands[selectedIndex];
      if (selectedCommand) {
        if (selectedCommand.href) {
          router.push(selectedCommand.href);
        } else if (selectedCommand.action) {
          selectedCommand.action();
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCommandClick = (command: CommandItem) => {
    if (command.href) {
      router.push(command.href);
    } else if (command.action) {
      command.action();
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[20vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Command Palette */}
          <motion.div
            className="relative w-full max-w-2xl glass-modal shadow-[var(--shadow-glass)]"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--glass-border)]">
              <Search size={20} className="text-[var(--muted)]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--muted)] focus:outline-none text-lg"
              />
              <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <kbd className="px-2 py-1 bg-[var(--muted)] rounded text-[var(--text-primary)]">⌘</kbd>
                <kbd className="px-2 py-1 bg-[var(--muted)] rounded text-[var(--text-primary)]">K</kbd>
              </div>
            </div>

            {/* Command List */}
            <div 
              ref={listRef}
              className="max-h-96 overflow-y-auto p-2"
            >
              {Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-2 py-1 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {commands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <motion.button
                          key={command.id}
                          onClick={() => handleCommandClick(command)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] text-left transition-standard",
                            isSelected 
                              ? "bg-[var(--accent)] text-[var(--accent-contrast)]" 
                              : "hover:bg-[var(--muted)] text-[var(--text-primary)]"
                          )}
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <command.icon 
                            size={18} 
                            className={cn(
                              isSelected ? "text-[var(--accent-contrast)]" : "text-[var(--muted)]"
                            )} 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{command.title}</div>
                            <div className={cn(
                              "text-sm truncate",
                              isSelected ? "text-[var(--accent-contrast)]/80" : "text-[var(--muted)]"
                            )}>
                              {command.description}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {filteredCommands.length === 0 && (
                <div className="py-8 text-center text-[var(--muted)]">
                  <Command size={48} className="mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">No commands found</div>
                  <div className="text-sm">Try a different search term</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--glass-border)] text-xs text-[var(--muted)]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-[var(--text-primary)]">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-[var(--text-primary)]">↵</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-[var(--text-primary)]">esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div className="text-[var(--muted)]">
                {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
