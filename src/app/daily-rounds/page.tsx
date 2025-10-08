"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Users, 
  Shield,
  Plus,
  Download,
  FileText,
  Settings,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Eye,
  Trash2,
  RefreshCw,
  Sparkles,
  Printer
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';

interface RoundItem {
  id: string;
  category: string;
  task: string;
  frequency: string;
  compliance_related: boolean;
  notes?: string;
  completed?: boolean;
  completed_at?: string;
  completed_by?: string;
}

interface DailyRound {
  id: string;
  title: string;
  unit: string;
  shift: string;
  created_at: string;
  items: RoundItem[];
  metadata: {
    facility_name: string;
    template_type: string;
  };
}

interface CustomRoundItem {
  category: string;
  task: string;
  frequency: string;
  compliance_related: boolean;
  notes?: string;
}

export default function DailyRoundsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();

  // Add print styles - optimized for single page
  React.useEffect(() => {
    const printStyles = `
      <style id="daily-round-print-styles">
        @media print {
          /* Hide everything except the print area */
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          .no-print { display: none !important; }
          
          /* Single page optimization */
          @page { 
            margin: 0.25in; 
            size: letter portrait;
          }
          
          /* Compact headers */
          .print-area h1, .print-area h2 { 
            font-size: 12px !important; 
            margin: 4px 0 2px 0 !important;
            font-weight: 600 !important;
          }
          .print-area h3 { 
            font-size: 10px !important; 
            margin: 3px 0 2px 0 !important;
            font-weight: 600 !important;
          }
          
          /* Compact cards and sections */
          .print-area .bg-white, 
          .print-area .bg-gray-800,
          .print-area .rounded-lg,
          .print-area .border { 
            background: transparent !important; 
            border: 1px solid #999 !important;
            margin: 2px 0 !important;
            padding: 4px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          
          /* Ultra compact spacing */
          .print-area .space-y-6 > * + * { margin-top: 3px !important; }
          .print-area .space-y-4 > * + * { margin-top: 2px !important; }
          .print-area .p-6 { padding: 4px !important; }
          .print-area .p-4 { padding: 3px !important; }
          .print-area .mb-4 { margin-bottom: 2px !important; }
          .print-area .mb-2 { margin-bottom: 1px !important; }
          .print-area .mt-2 { margin-top: 1px !important; }
          .print-area .mt-1 { margin-top: 0.5px !important; }
          .print-area .gap-4 { gap: 2px !important; }
          .print-area .gap-3 { gap: 1.5px !important; }
          .print-area .gap-2 { gap: 1px !important; }
          
          /* Compact grid layout */
          .print-area .grid { 
            display: grid !important;
            gap: 2px !important;
          }
          
          /* Compact dividers */
          .print-area .divide-y > * + * {
            border-top-width: 1px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          
          /* Compact badges and labels */
          .print-area .px-2,
          .print-area .py-1 {
            padding: 1px 3px !important;
            font-size: 7px !important;
          }
          
          /* Compact signature section */
          .print-area .border-b { 
            border-bottom-width: 1px !important;
            padding-bottom: 1px !important;
          }
          
          /* Prevent page breaks inside important sections */
          .print-area > div,
          .print-break-inside-avoid { 
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Icon sizing */
          .print-area svg {
            width: 10px !important;
            height: 10px !important;
          }
          
          /* Checkbox sizing */
          .print-area .w-6 { width: 12px !important; }
          .print-area .h-6 { height: 12px !important; }
          
          /* Hide dark mode specific styles */
          .dark\\:bg-gray-800,
          .dark\\:bg-gray-700,
          .dark\\:border-gray-700,
          .dark\\:border-gray-600,
          .dark\\:text-gray-100,
          .dark\\:text-gray-400 {
            background: transparent !important;
            color: #000 !important;
          }
        }
      </style>
    `;
    const existingStyles = document.head.querySelector('#daily-round-print-styles');
    if (!existingStyles) {
      document.head.insertAdjacentHTML('beforeend', printStyles);
    }
    return () => {
      const styles = document.head.querySelector('#daily-round-print-styles');
      if (styles) styles.remove();
    };
  }, []);
  
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [loading, setLoading] = useState(false);
  const [recentRounds, setRecentRounds] = useState<DailyRound[]>([]);
  const [currentRound, setCurrentRound] = useState<DailyRound | null>(null);
  const [showRoundView, setShowRoundView] = useState(false);
  
  // Form state
  const [templateType, setTemplateType] = useState('general_management');
  const [unit, setUnit] = useState('General');
  const [shift, setShift] = useState<'7a-3p' | '3p-11p' | '11p-7a'>('7a-3p');
  const [residentAcuity, setResidentAcuity] = useState<'low' | 'medium' | 'high'>('medium');
  const [aiCustomize, setAiCustomize] = useState(false);
  const [specialFocusAreas, setSpecialFocusAreas] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomRoundItem[]>([]);

  // Load custom items from localStorage on component mount
  useEffect(() => {
    const savedCustomItems = localStorage.getItem('dailyRoundCustomItems');
    if (savedCustomItems) {
      try {
        setCustomItems(JSON.parse(savedCustomItems));
      } catch (error) {
        console.error('Failed to load saved custom items:', error);
      }
    }
  }, []);

  // Save custom items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dailyRoundCustomItems', JSON.stringify(customItems));
  }, [customItems]);
  const [includeDate, setIncludeDate] = useState(false);
  const [customDate, setCustomDate] = useState('');

  const templateOptions = [
    { value: 'unit_manager', label: 'Unit Manager', description: 'Comprehensive facility oversight and compliance' },
    { value: 'charge_nurse', label: 'Charge Nurse', description: 'Nursing supervision and patient care coordination' },
    { value: 'director_of_nursing', label: 'Director of Nursing', description: 'Strategic nursing leadership and quality oversight' },
    { value: 'general_management', label: 'General Management', description: 'Administrative oversight and facility operations' },
  ];

  const focusAreaOptions = [
    'Fresh Daily Items', 'Infection Control', 'Fall Prevention', 'Medication Safety', 'Wound Care',
    'Dementia Care', 'End-of-Life Care', 'Nutritional Support', 'Mental Health',
    'Physical Therapy', 'Emergency Preparedness', 'Family Communication'
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadRecentRounds();
  }, [isAuthenticated, user]);

  const loadRecentRounds = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/daily-rounds', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRecentRounds(result.rounds || []);
      }
    } catch (error) {
      console.error('Failed to load recent rounds:', error);
    }
  };

  const generateRound = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/daily-rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          template_type: templateType,
          unit,
          shift,
          custom_items: customItems,
          ai_customize: aiCustomize,
          resident_acuity: residentAcuity,
          special_focus_areas: specialFocusAreas
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentRound(result.round);
        setShowRoundView(true);
        loadRecentRounds();
      } else {
        const error = await response.json();
        alert(`Failed to generate round: ${error.error}`);
      }
    } catch (error) {
      console.error('Round generation failed:', error);
      alert('Failed to generate daily round. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addCustomItem = () => {
    setCustomItems([...customItems, {
      category: 'Custom',
      task: '',
      frequency: 'daily',
      compliance_related: false
    }]);
  };

  const updateCustomItem = (index: number, field: keyof CustomRoundItem, value: any) => {
    const updated = [...customItems];
    updated[index] = { ...updated[index], [field]: value };
    setCustomItems(updated);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const toggleFocusArea = (area: string) => {
    setSpecialFocusAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const generatePDF = async (round: DailyRound) => {
    // Just use the browser's print to PDF - it's simpler and works reliably
    window.print();
  };

  const renderCreateTab = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-primary">Select Round Template</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templateOptions.map(option => (
            <motion.button
              key={option.value}
              onClick={() => setTemplateType(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                templateType === option.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h4 className="font-medium text-primary">{option.label}</h4>
              <p className="text-sm text-muted mt-1">{option.description}</p>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Basic Configuration */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-primary">Round Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Unit</label>
            <Input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., ICU, Medical, Dementia"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full p-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] bg-[var(--bg)] text-primary"
            >
              <option value="7a-3p">Day Shift (7a-3p)</option>
              <option value="3p-11p">Evening Shift (3p-11p)</option>
              <option value="11p-7a">Night Shift (11p-7a)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Resident Acuity</label>
            <select
              value={residentAcuity}
              onChange={(e) => setResidentAcuity(e.target.value as any)}
              className="w-full p-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] bg-[var(--bg)] text-primary"
            >
              <option value="low">Low Acuity</option>
              <option value="medium">Medium Acuity</option>
              <option value="high">High Acuity</option>
            </select>
          </div>
        </div>
        
        {/* Date Option */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <h4 className="text-md font-semibold text-primary mb-3">PDF Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeDate"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              <label htmlFor="includeDate" className="text-sm text-primary">
                Include specific date on PDF (instead of "Generated" date)
              </label>
            </div>
            {includeDate && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Date for Rounds
                </label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  placeholder={new Date().toLocaleDateString()}
                />
                <p className="text-xs text-muted mt-1">
                  Leave empty to use today's date ({new Date().toLocaleDateString()})
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* AI Customization */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-primary">AI Customization</h3>
        </div>
        
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={aiCustomize}
            onChange={(e) => setAiCustomize(e.target.checked)}
            className="rounded"
          />
          <span className="text-primary">Add AI-generated items based on special focus areas</span>
        </label>
        
        {aiCustomize && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted">
                Select "Fresh Daily Items" for completely new AI-generated checklist each day, or choose specific focus areas:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (specialFocusAreas.length === focusAreaOptions.length) {
                    setSpecialFocusAreas([]);
                  } else {
                    setSpecialFocusAreas([...focusAreaOptions]);
                  }
                }}
              >
                {specialFocusAreas.length === focusAreaOptions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {focusAreaOptions.map(area => (
                <label key={area} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specialFocusAreas.includes(area)}
                    onChange={() => toggleFocusArea(area)}
                    className="rounded"
                  />
                  <span className="text-sm text-primary">{area}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Custom Items */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Custom Round Items</h3>
          <Button
            onClick={addCustomItem}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </Button>
        </div>
        
        {customItems.length === 0 ? (
          <p className="text-muted text-center py-8">
            No custom items added. Click "Add Custom Item" to create facility-specific round items.
          </p>
        ) : (
          <div className="space-y-4">
            {customItems.map((item, index) => (
              <div key={index} className="p-4 bg-[var(--muted)]/20 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1">Task</label>
                    <Input
                      type="text"
                      value={item.task}
                      onChange={(e) => updateCustomItem(index, 'task', e.target.value)}
                      placeholder="Enter task description"
                      size="sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1">Category</label>
                    <Input
                      type="text"
                      value={item.category}
                      onChange={(e) => updateCustomItem(index, 'category', e.target.value)}
                      placeholder="Category"
                      size="sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1">Priority</label>
                    <select
                      value={item.priority}
                      onChange={(e) => updateCustomItem(index, 'priority', e.target.value)}
                      className="w-full p-2 text-sm border border-[var(--border)] rounded bg-[var(--bg)] text-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomItem(index)}
                      className="text-[var(--err)] hover:text-[var(--err)] hover:bg-[var(--err)]/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.compliance_related}
                      onChange={(e) => updateCustomItem(index, 'compliance_related', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-primary">Compliance Related</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateRound}
          disabled={loading}
          size="lg"
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating Round...
            </>
          ) : (
            <>
              <CheckSquare className="h-5 w-5" />
              Generate Daily Round
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <Card variant="glass">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Recent Daily Rounds</h3>
            <Button
              variant="outline"
              onClick={loadRecentRounds}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-[var(--border)]">
          {recentRounds.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p>No daily rounds generated yet.</p>
              <p className="text-sm">Create your first round to see history here.</p>
            </div>
          ) : (
            recentRounds.map((round) => (
              <div key={round.id} className="p-6 hover:bg-[var(--muted)]/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckSquare className="h-5 w-5 text-[var(--accent)]" />
                      <h4 className="font-medium text-primary">{round.title}</h4>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {round.unit} Unit
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {round.shift}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {round.items?.length || 0} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(round.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentRound(round);
                        setShowRoundView(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generatePDF(round)}
                      className="text-[var(--ok)] hover:text-[var(--ok)] hover:bg-[var(--ok)]/10"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );

  const renderRoundView = () => {
    if (!currentRound) return null;

    // Safely handle missing or invalid items array
    const items = Array.isArray(currentRound.items) ? currentRound.items : [];
    const categorizedItems = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, RoundItem[]>);

    return (
      <div className="space-y-6 print-area">
        {/* Round Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{currentRound.title}</h2>
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => generatePDF(currentRound)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>Unit: {currentRound.unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Shift: {currentRound.shift}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span>{items.length} Items</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Created: {new Date(currentRound.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Round Items by Category */}
        {Object.entries(categorizedItems).map(([category, items]) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 print-break-inside-avoid">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{category}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {items.length} items
              </p>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-600">
              {items.map((item, index) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 border-2 border-gray-300 rounded mt-0.5 flex-shrink-0"></div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                          {item.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500 ml-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.priority === 'high' 
                              ? 'bg-red-100 text-red-800'
                              : item.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.priority}
                          </span>
                          
                          {item.compliance_related && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              COMPLIANCE
                            </span>
                          )}
                          
                          <span className="text-xs">
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Completed by: _________________</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Signature Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Round Completion</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Staff Member</label>
                <div className="border-b border-gray-300 pb-2">
                  <span className="text-gray-400">_________________________________</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                <div className="border-b border-gray-300 pb-2">
                  <span className="text-gray-400">_________________________________</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes/Issues Identified</label>
              <div className="space-y-2">
                <div className="border-b border-gray-300 pb-2">
                  <span className="text-gray-400">_________________________________________________________________</span>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <span className="text-gray-400">_________________________________________________________________</span>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <span className="text-gray-400">_________________________________________________________________</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setShowRoundView(false)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Back to Rounds
          </button>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (showRoundView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {renderRoundView()}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Daily Rounds
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base pl-14">
          Generate customizable daily round checklists for unit managers and nursing staff with compliance focus
        </p>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'create'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-muted hover:text-primary hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Round
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-muted hover:text-primary hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Round History ({recentRounds.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? renderCreateTab() : renderHistoryTab()}
    </div>
  );
}