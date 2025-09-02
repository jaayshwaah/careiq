import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  MessageCircle, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  Settings, 
  Shield, 
  BarChart3,
  Bell,
  Search,
  Plus,
  User,
  LogOut,
  Building2,
  Users,
  FileText,
  Activity,
  AlertTriangle,
  TrendingUp,
  Bookmark,
  Upload,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

const IntegratedNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [surveyReadiness, setSurveyReadiness] = useState(null);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
      loadNotifications();
      loadSurveyReadiness();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setIsAdmin(data.profile?.is_admin || data.profile?.role === 'admin');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const notifications = await response.json();
        setNotifications(notifications);
        setUnreadCount(notifications.filter(n => !n.read).length);
      } else {
        // Fallback to empty state
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const loadSurveyReadiness = async () => {
    try {
      const response = await fetch('/api/survey-prep');
      if (response.ok) {
        const data = await response.json();
        // Calculate readiness based on progress
        const totalItems = Object.values(data.sections || {}).reduce((sum, section) => sum + section.items.length, 0);
        const completedItems = Object.keys(data.progress || {}).filter(key => data.progress[key]).length;
        const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        setSurveyReadiness({
          score,
          status: score >= 90 ? 'Ready' : score >= 70 ? 'Almost Ready' : score >= 50 ? 'In Progress' : 'Needs Attention'
        });
      }
    } catch (error) {
      console.error('Failed to load survey readiness:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ title: 'New chat' }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          router.push(`/chat/${chat.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const mainNavItems = [
    {
      id: 'chat',
      label: 'Chat Assistant',
      icon: MessageCircle,
      href: '/chat',
      description: 'AI-powered compliance guidance',
      badge: null,
      action: createNewChat
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: BookOpen,
      href: '/knowledge',
      description: 'Upload and manage documents',
      badge: null
    },
    {
      id: 'survey-prep',
      label: 'Survey Preparation',
      icon: CheckSquare,
      href: '/survey-prep',
      description: 'Comprehensive survey readiness',
      badge: surveyReadiness?.status,
      badgeColor: surveyReadiness?.score >= 90 ? 'green' : surveyReadiness?.score >= 70 ? 'yellow' : 'red'
    },
    {
      id: 'calendar',
      label: 'Compliance Calendar',
      icon: Calendar,
      href: '/calendar',
      description: 'Track deadlines and events',
      badge: null
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      href: '/bookmarks',
      description: 'Saved conversations and resources',
      badge: null
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      description: 'Usage insights and trends',
      badge: null
    }
  ];

  const quickActions = [
    {
      label: 'New Chat',
      icon: Plus,
      action: createNewChat,
      shortcut: 'Ctrl+N'
    },
    {
      label: 'Upload Documents',
      icon: Upload,
      action: () => router.push('/knowledge?tab=upload'),
      shortcut: 'Ctrl+U'
    },
    {
      label: 'Survey Checklist',
      icon: Target,
      action: () => router.push('/survey-prep?tab=checklist'),
      shortcut: 'Ctrl+S'
    }
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Main Navigation Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CareIQ</h1>
              <p className="text-xs text-gray-500">Nursing Home Assistant</p>
            </div>
          </div>
          
          {/* User Context */}
          {profile && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {profile.facility_name || 'No Facility Set'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-700">
                  {profile.role || 'No Role Set'} • {profile.facility_state || 'No State'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="space-y-1">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <action.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{action.label}</span>
                <span className="text-xs text-gray-400">{action.shortcut}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Main Features
          </h2>
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname?.startsWith(item.href) || (item.id === 'chat' && pathname === '/');
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={item.action || (() => router.push(item.href))}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.badgeColor === 'green' ? 'bg-green-100 text-green-700' :
                      item.badgeColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      item.badgeColor === 'red' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Survey Readiness Widget */}
          {surveyReadiness && (
            <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2 mb-2">
                <Award className="h-4 w-4" />
                Survey Readiness
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-700">{surveyReadiness.status}</span>
                    <span className="text-sm font-bold text-purple-900">{surveyReadiness.score}%</span>
                  </div>
                  <div className="h-2 bg-purple-200 rounded-full">
                    <div 
                      className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${surveyReadiness.score}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/survey-prep')}
                className="w-full mt-3 px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                View Checklist
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => markNotificationRead(