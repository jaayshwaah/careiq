"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  X, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Star, 
  StarOff,
  Save,
  RotateCcw,
  Check
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';

interface SidebarItem {
  id: string;
  href: string;
  label: string;
  icon: any;
  category: 'main' | 'tools' | 'admin';
  adminOnly?: boolean;
  visible: boolean;
  favorite: boolean;
  order: number;
}

interface SidebarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: any) => void;
}

const SidebarCustomizer: React.FC<SidebarCustomizerProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { user } = useAuth();
  const supabase = getBrowserSupabase();
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Default sidebar items
  const defaultItems: SidebarItem[] = [
    // Main navigation
    { id: 'home', href: '/', label: 'Home', icon: 'Home', category: 'main', visible: true, favorite: true, order: 1 },
    { id: 'chat', href: '/chat', label: 'Chat Assistant', icon: 'MessageCircle', category: 'main', visible: true, favorite: true, order: 2 },
    { id: 'compliance', href: '/cms-guidance', label: 'Compliance & Surveys', icon: 'Shield', category: 'main', visible: true, favorite: false, order: 3 },
    { id: 'daily-rounds', href: '/daily-rounds', label: 'Daily Rounds', icon: 'ClipboardList', category: 'main', visible: true, favorite: false, order: 4 },
    { id: 'care-planning', href: '/care-plan-assistant', label: 'Care Planning', icon: 'FileText', category: 'main', visible: true, favorite: false, order: 5 },
    { id: 'knowledge', href: '/knowledge', label: 'Knowledge Base', icon: 'BookOpen', category: 'main', visible: true, favorite: false, order: 6 },
    { id: 'supply', href: '/supply-management', label: 'Supply & Inventory', icon: 'Package', category: 'main', visible: true, favorite: false, order: 7 },
    { id: 'reports', href: '/reports', label: 'Analytics & Reports', icon: 'BarChart3', category: 'main', visible: true, favorite: false, order: 8 },
    { id: 'workflows', href: '/admin/workflow-designer', label: 'Workflows', icon: 'Zap', category: 'main', visible: true, favorite: false, order: 9 },
    { id: 'integrations', href: '/calendar-integrations', label: 'Integrations', icon: 'ExternalLink', category: 'main', visible: true, favorite: false, order: 10 },
    
    // Tools
    { id: 'ppd-calculator', href: '/ppd-calculator', label: 'PPD Calculator', icon: 'Calculator', category: 'tools', visible: true, favorite: false, order: 11 },
    { id: 'survey-prep', href: '/survey-prep', label: 'Survey Prep', icon: 'CheckSquare', category: 'tools', visible: true, favorite: false, order: 12 },
    { id: 'pbj-corrector', href: '/pbj-corrector-ai', label: 'PBJ Corrector', icon: 'FileSpreadsheet', category: 'tools', visible: true, favorite: false, order: 13 },
    { id: 'task-management', href: '/task-management', label: 'Task Management', icon: 'ListTodo', category: 'tools', visible: true, favorite: false, order: 14 },
    { id: 'supplier-management', href: '/supplier-management', label: 'Supplier Management', icon: 'Truck', category: 'tools', adminOnly: true, visible: true, favorite: false, order: 15 },
    
    // Admin
    { id: 'admin-dashboard', href: '/admin', label: 'Admin Dashboard', icon: 'Settings', category: 'admin', adminOnly: true, visible: true, favorite: false, order: 16 },
    { id: 'user-management', href: '/admin/users', label: 'User Management', icon: 'Users', category: 'admin', adminOnly: true, visible: true, favorite: false, order: 17 },
    { id: 'facility-settings', href: '/admin/facilities', label: 'Facility Settings', icon: 'Building2', category: 'admin', adminOnly: true, visible: true, favorite: false, order: 18 },
  ];

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('sidebar_preferences')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
      }

      if (data?.sidebar_preferences) {
        // Merge saved preferences with defaults
        const savedItems = data.sidebar_preferences.items || [];
        const mergedItems = defaultItems.map(defaultItem => {
          const savedItem = savedItems.find((item: any) => item.id === defaultItem.id);
          return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
        });
        setItems(mergedItems);
      } else {
        setItems(defaultItems);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setItems(defaultItems);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const preferences = {
        items: items.map(item => ({
          id: item.id,
          visible: item.visible,
          favorite: item.favorite,
          order: item.order
        }))
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          sidebar_preferences: preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving preferences:', error);
        return;
      }

      setSaved(true);
      onSave(preferences);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    ));
  };

  const toggleFavorite = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, favorite: !item.favorite } : item
    ));
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems(prev => {
      const newItems = [...prev];
      const currentIndex = newItems.findIndex(item => item.id === id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex >= 0 && targetIndex < newItems.length) {
        [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];
        // Update order values
        newItems.forEach((item, index) => {
          item.order = index + 1;
        });
      }
      
      return newItems;
    });
  };

  const resetToDefaults = () => {
    setItems(defaultItems);
  };

  const categories = [
    { key: 'main', label: 'Main Navigation', color: 'blue' },
    { key: 'tools', label: 'Tools & Utilities', color: 'green' },
    { key: 'admin', label: 'Administration', color: 'purple' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customize Sidebar</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Choose which tools appear in your sidebar and mark your favorites
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(category => {
                  const categoryItems = items.filter(item => item.category === category.key);
                  
                  return (
                    <div key={category.key} className="space-y-3">
                      <h3 className={`text-lg font-semibold text-${category.color}-600 dark:text-${category.color}-400`}>
                        {category.label}
                      </h3>
                      <div className="space-y-2">
                        {categoryItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            {/* Drag Handle */}
                            <div className="cursor-move text-gray-400 hover:text-gray-600">
                              <GripVertical size={16} />
                            </div>

                            {/* Item Info */}
                            <div className="flex-1 flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <div className="w-4 h-4 bg-gray-400 rounded" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {item.label}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.href}
                                </div>
                              </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                              {/* Move Up/Down */}
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => moveItem(item.id, 'up')}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-400" />
                                </button>
                                <button
                                  onClick={() => moveItem(item.id, 'down')}
                                  disabled={index === categoryItems.length - 1}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-400" />
                                </button>
                              </div>

                              {/* Favorite Toggle */}
                              <button
                                onClick={() => toggleFavorite(item.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  item.favorite 
                                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' 
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400'
                                }`}
                              >
                                {item.favorite ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                              </button>

                              {/* Visibility Toggle */}
                              <button
                                onClick={() => toggleVisibility(item.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  item.visible 
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400'
                                }`}
                              >
                                {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
            
            <div className="flex items-center gap-3">
              {saved && (
                <motion.div
                  className="flex items-center gap-2 text-green-600 dark:text-green-400"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Check size={16} />
                  <span className="text-sm font-medium">Saved!</span>
                </motion.div>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SidebarCustomizer;



