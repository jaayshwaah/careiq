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
  StarOff,
  Sliders
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import SettingsModal from "@/components/SettingsModal";

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
  id?: string;
  href: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  badge?: string | number;
  children?: NavigationItem[];
  category?: 'main' | 'tools' | 'admin';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  collapsed = false, 
  onToggleCollapse 
}) => {
  const { user, userProfile, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [chats, setChats] = useState<Chat[]>([]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityLogo, setFacilityLogo] = useState<string | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  
  // Customization state
  const [sidebarPreferences, setSidebarPreferences] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAllChatsModal, setShowAllChatsModal] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  // Default navigation structure
  const defaultNavigationItems: NavigationItem[] = [
    { id: 'home', href: "/", label: "Home", icon: Home, category: 'main' },
    { id: 'chat', href: "/chat", label: "AI Assistant", icon: MessageCircle, category: 'main' },
    { id: 'compliance', href: "/cms-guidance", label: "Compliance & Survey Prep", icon: Shield, category: 'main' },
    { id: 'care-planning', href: "/care-plan-assistant", label: "Care Planning", icon: FileText, category: 'main' },
    { id: 'daily-rounds', href: "/daily-rounds", label: "Daily Rounds", icon: ClipboardList, category: 'main' },
    { id: 'knowledge', href: "/knowledge", label: "Knowledge Base", icon: BookOpen, category: 'main' },
    { id: 'ppd-calculator', href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator, category: 'main' },
    { id: 'pbj-corrector', href: "/pbj-corrector-ai", label: "PBJ Corrector", icon: FileSpreadsheet, category: 'main' },
    { id: 'supply', href: "/supply-management", label: "Supplies", icon: Package, category: 'main' },
    { id: 'task-management', href: "/task-management", label: "Tasks", icon: ListTodo, category: 'main' },
    { id: 'reports', href: "/reports", label: "Reports & Analytics", icon: BarChart3, category: 'main' },
    { id: 'workflows', href: "/admin/workflow-designer", label: "Workflows", icon: Zap, category: 'main', adminOnly: true },
  ];

  // Tools navigation - now empty, everything in main
  const toolsNavigationItems: NavigationItem[] = [];

  // Get filtered navigation items based on preferences
  const getFilteredNavigationItems = (items: NavigationItem[], preferences: any) => {
    if (!preferences?.items) return items;
    
    return items
      .filter(item => {
        const pref = preferences.items.find((p: any) => p.id === item.id);
        return pref ? pref.visible : true;
      })
      .sort((a, b) => {
        const prefA = preferences.items.find((p: any) => p.id === a.id);
        const prefB = preferences.items.find((p: any) => p.id === b.id);
        const orderA = prefA?.order || 999;
        const orderB = prefB?.order || 999;
        return orderA - orderB;
      });
  };

  // Get favorite items
  const getFavoriteItems = (preferences: any) => {
    if (!preferences?.items) return [];
    
    const allItems = [...defaultNavigationItems, ...toolsNavigationItems];
    return allItems
      .filter(item => {
        const pref = preferences.items.find((p: any) => p.id === item.id);
        return pref?.favorite && pref?.visible;
      })
      .sort((a, b) => {
        const prefA = preferences.items.find((p: any) => p.id === a.id);
        const prefB = preferences.items.find((p: any) => p.id === b.id);
        const orderA = prefA?.order || 999;
        const orderB = prefB?.order || 999;
        return orderA - orderB;
      });
  };

  // Dynamic navigation items
  const mainNavigationItems = getFilteredNavigationItems(defaultNavigationItems, sidebarPreferences);
  const favoriteItems = getFavoriteItems(sidebarPreferences);
  const filteredToolsItems = getFilteredNavigationItems(toolsNavigationItems, sidebarPreferences);

  const adminNavigationItems: NavigationItem[] = [
    { id: 'admin-dash', href: "/admin", label: "Dashboard", icon: Settings, category: 'admin' },
    { id: 'admin-users', href: "/admin/users", label: "Users", icon: Users, category: 'admin' },
    { id: 'admin-facilities', href: "/admin/facilities", label: "Facilities", icon: Building2, category: 'admin' },
    { id: 'admin-kb', href: "/admin/knowledge-base", label: "CMS Knowledge Base", icon: Database, category: 'admin' },
  ];
  
  // Check if user is a CareIQ admin (internal team)
  const isAdmin = userProfile?.is_admin || 
                  userProfile?.role === 'administrator' || 
                  String(userProfile?.role || '').toLowerCase().includes('administrator');
  const isCareIQAdmin = isAdmin && (user?.email?.includes('@careiq.') || user?.email === 'jking4600@gmail.com');

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
      loadSidebarPreferences();
    }
  }, [isAuthenticated, user?.id]);

  // Load sidebar preferences
  const loadSidebarPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('sidebar_preferences')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading sidebar preferences:', error);
        return;
      }

      if (data?.sidebar_preferences) {
        setSidebarPreferences(data.sidebar_preferences);
      }
    } catch (error) {
      console.error('Error loading sidebar preferences:', error);
    }
  };

  // Handle preferences save
  const handlePreferencesSave = (preferences: any) => {
    setSidebarPreferences(preferences);
    setShowCustomizer(false);
  };

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
    <div className={title && showTitle ? "space-y-1" : ""}>
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
            transition={{ duration: 0.1 }}
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
        "flex flex-col h-full border-r transition-all duration-150 glass border-[var(--glass-border)]",
        isCollapsed ? 'w-16' : 'w-80',
        className
      )}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 320 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex-none border-b border-[var(--glass-border)] p-4">
          <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <motion.div 
              className="flex justify-center items-center w-8 h-8 rounded-[var(--radius-lg)] shadow-soft"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.1 }}
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
          {/* CareIQ Admin Button - Above everything */}
          {isCareIQAdmin && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] font-semibold transition-standard bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <Shield size={18} />
                <span>CareIQ Admin</span>
              </Link>
            </motion.div>
          )}
          
          {isCareIQAdmin && isCollapsed && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/admin"
                className="flex items-center justify-center p-3 rounded-[var(--radius-md)] transition-standard bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl"
                title="CareIQ Admin"
              >
                <Shield size={18} />
              </Link>
            </motion.div>
          )}
          
          {/* Favorites Section */}
          {favoriteItems.length > 0 && (
            <NavigationSection items={favoriteItems} title="Favorites" />
          )}

          {/* Main Navigation */}
          <NavigationSection items={mainNavigationItems} />

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
                        transition={{ duration: 0.1 }}
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
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-[var(--radius-md)] transition-standard hover:bg-[var(--muted)] focus-ring inline-flex items-center justify-center"
              title="Settings"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Settings size={16} className="text-muted" />
              </motion.div>
            </button>
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

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </motion.div>
  );
};

export default Sidebar;
