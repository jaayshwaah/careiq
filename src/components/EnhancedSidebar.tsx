"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageCircle,
  Settings,
  User,
  LogOut,
  Home,
  Bell,
  BarChart3,
  Calendar,
  BookOpen,
  Shield,
  Search,
  Star,
  Pencil,
  Trash2,
  Wrench,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Upload,
  FileSpreadsheet,
  ListTodo,
  Package,
  Workflow,
  Truck,
  Building2,
  Command,
  Activity,
  AlertCircle,
  Users,
  FileText,
  ClipboardList,
  Database,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
}

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  badge?: string | number;
  children?: NavigationItem[];
}

const EnhancedSidebar: React.FC<SidebarProps> = ({ 
  className, 
  collapsed = false, 
  onToggleCollapse 
}) => {
  const { user, userProfile, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityLogo, setFacilityLogo] = useState<string | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);

  // Navigation structure
  const mainNavigationItems: NavigationItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat Assistant", icon: MessageCircle },
    { href: "/cms-guidance", label: "Compliance & Surveys", icon: Shield },
    { href: "/daily-rounds", label: "Daily Operations", icon: ClipboardList },
    { href: "/care-plan-assistant", label: "Care Planning", icon: FileText },
    { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "/supply-management", label: "Supply & Inventory", icon: Package },
    { href: "/reports", label: "Analytics & Reports", icon: BarChart3 },
    { href: "/admin/workflow-designer", label: "Workflows", icon: Zap },
    { href: "/calendar-integrations", label: "Integrations", icon: ExternalLink },
  ];

  const adminNavigationItems: NavigationItem[] = [
    { href: "/admin", label: "Admin Dashboard", icon: Settings },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/facilities", label: "Facility Settings", icon: Building2 },
    { href: "/admin/workflow-designer", label: "Workflow Designer", icon: Workflow },
  ];

  const toolsNavigationItems: NavigationItem[] = [
    { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
    { href: "/survey-prep", label: "Survey Prep", icon: CheckSquare },
    { href: "/pbj-corrector-ai", label: "PBJ Corrector", icon: FileSpreadsheet },
    { href: "/task-management", label: "Task Management", icon: ListTodo },
    { href: "/supplier-management", label: "Supplier Management", icon: Truck, adminOnly: true },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
    onToggleCollapse?.();
  }, [isCollapsed, onToggleCollapse]);

  const isCurrentPath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/chat") {
      return pathname === "/chat" || pathname.startsWith("/chat/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const createNewChat = async () => {
    try {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from('chats')
        .insert([{ title: 'New Chat' }])
        .select()
        .single();

      if (error) throw error;
      router.push(`/chat/${data.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const loadChats = async () => {
    if (!user?.id) return;
    
    try {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadFacilityData = async () => {
    if (!user?.id) return;
    
    try {
      const supabase = getBrowserSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('facility_name, facility_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.facility_name) {
        setFacilityName(profile.facility_name);
      }
    } catch (error) {
      console.error('Error loading facility data:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
      loadFacilityData();
    }
  }, [isAuthenticated, user?.id]);

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return null;
  }

  const NavigationSection = ({ items, title, showTitle = true }: { 
    items: NavigationItem[], 
    title?: string,
    showTitle?: boolean 
  }) => (
    <div className="space-y-1">
      {showTitle && !isCollapsed && title && (
        <div className="px-2 mb-3 text-xs font-semibold tracking-wider uppercase text-muted">
          {title}
        </div>
      )}
      {items.map((item) => {
        if (item.adminOnly && !userProfile?.role?.includes('administrator')) {
          return null;
        }
        
        const Icon = item.icon;
        const isActive = isCurrentPath(item.href);
        
        return (
          <motion.div
            key={item.href}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] font-medium transition-standard group",
                isCollapsed ? "justify-center" : "",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 dark:bg-blue-500 dark:text-white"
                  : "text-primary hover:bg-[var(--muted)]"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon 
                size={18} 
                className={cn(
                  isActive ? "text-white dark:text-white" : "text-muted group-hover:text-primary"
                )} 
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--accent)] text-[var(--accent-contrast)] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <motion.div
      className={cn(
        "flex flex-col h-full border-r transition-all duration-300 glass border-[var(--glass-border)]",
        isCollapsed ? 'w-16' : 'w-80',
        className
      )}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex-none border-b border-[var(--glass-border)] p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <motion.div 
              className="flex justify-center items-center w-8 h-8 rounded-[var(--radius-lg)] shadow-soft"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              style={{
                background: brandingSettings?.primary_color 
                  ? `linear-gradient(to bottom right, ${brandingSettings.primary_color}, ${brandingSettings.primary_color}CC)`
                  : 'linear-gradient(to bottom right, var(--accent), var(--accent-hover))'
              }}
            >
              {facilityLogo || brandingSettings?.logo_url ? (
                <img 
                  src={facilityLogo || brandingSettings.logo_url} 
                  alt={facilityName ? `${facilityName} logo` : "Company logo"} 
                  className="object-contain w-full h-full rounded-[var(--radius-lg)]"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {facilityName 
                    ? facilityName.charAt(0).toUpperCase() 
                    : brandingSettings?.company_name 
                      ? brandingSettings.company_name.charAt(0).toUpperCase() 
                      : 'CIQ'}
                </span>
              )}
            </motion.div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate text-primary">
                  {facilityName || brandingSettings?.company_name || 'CareIQ'}
                </div>
                <div className="text-xs text-muted">
                  AI-Powered Operations
                </div>
              </div>
            )}
          </div>
          <motion.button
            onClick={toggleCollapse}
            className="p-1 rounded-[var(--radius-md)] transition-standard hover:bg-[var(--muted)] focus-ring"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </motion.button>
        </div>

        {/* New Chat Button */}
        {!isCollapsed && (
          <motion.button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 justify-center px-4 py-2.5 text-white rounded-[var(--radius-md)] font-medium transition-standard hover:scale-[1.02] active:scale-[0.98] shadow-soft focus-ring"
            style={{
              backgroundColor: brandingSettings?.primary_color || 'var(--accent)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            New Chat
          </motion.button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 min-h-0">
        <div className="p-3 space-y-6">
          {/* Main Navigation */}
          <NavigationSection items={mainNavigationItems} />

          {/* Tools Section */}
          <NavigationSection items={toolsNavigationItems} title="Tools" />

          {/* Admin Section */}
          {userProfile?.role?.includes('administrator') && (
            <NavigationSection items={adminNavigationItems} title="Administration" />
          )}

          {/* Recent Chats */}
          {!isCollapsed && (
            <div className="space-y-3">
              <div className="px-2 mb-2 text-xs font-semibold tracking-wider uppercase text-muted">
                Recent Chats
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-2 pr-3 pl-9 w-full text-sm placeholder-[var(--muted)] bg-[var(--muted)] rounded-[var(--radius-md)] border-0 focus:outline-none focus:ring-2 focus:ring-[var(--focus)] transition-standard"
                />
              </div>

              {/* Chat List */}
              <div className="space-y-1">
                <AnimatePresence>
                  {filteredChats.map((chat) => {
                    const isActive = pathname === `/chat/${chat.id}`;
                    
                    return (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ x: 4 }}
                      >
                        <div
                          className={cn(
                            "flex gap-3 items-center p-2 group rounded-[var(--radius-md)] transition-standard",
                            isActive 
                              ? "bg-[var(--accent)] text-[var(--accent-contrast)]" 
                              : "hover:bg-[var(--muted)]"
                          )}
                        >
                          <MessageCircle 
                            size={16} 
                            className={cn(
                              isActive ? "text-[var(--accent-contrast)]" : "text-muted group-hover:text-primary"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {chat.title || "Untitled chat"}
                            </div>
                            <div className="text-xs text-muted">
                              {new Date(chat.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {filteredChats.length === 0 && searchTerm && (
                  <div className="py-8 text-sm text-center text-muted">
                    No chats found
                  </div>
                )}
                
                {filteredChats.length === 0 && !searchTerm && (
                  <div className="py-8 text-sm text-center text-muted">
                    No chats yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer - User Section */}
      <div className="flex-none border-t border-[var(--glass-border)] p-3 glass">
        <div className={cn("flex items-center", isCollapsed ? 'flex-col gap-2' : 'justify-between')}>
          {!isCollapsed && (
            <div className="flex gap-3 items-center min-w-0">
              <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-br from-[var(--muted)] to-[var(--border)] rounded-full">
                <User size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-primary">
                  {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs truncate text-muted">
                  {userProfile?.role || 'Member'}
                </div>
              </div>
            </div>
          )}
          <div className={cn("flex items-center", isCollapsed ? 'flex-col gap-2' : 'gap-1')}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/settings"
                className="p-2 rounded-[var(--radius-md)] transition-standard hover:bg-[var(--muted)] focus-ring"
                title="Settings"
              >
                <Settings size={16} className="text-muted" />
              </Link>
            </motion.button>
            <motion.button
              onClick={() => {
                const supabase = getBrowserSupabase();
                supabase.auth.signOut();
              }}
              className="p-2 rounded-[var(--radius-md)] transition-standard hover:bg-[var(--muted)] focus-ring"
              title="Sign out"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={16} className="text-muted" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedSidebar;
