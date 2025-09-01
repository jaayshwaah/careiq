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

  // Add print styles
  React.useEffect(() => {
    const printStyles = `
      <style>
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          
          /* Compact spacing for print */
          .print-area h1, .print-area h2, .print-area h3 { 
            font-size: 14px !important; 
            margin: 8px 0 4px 0 !important;
          }
          .print-area .bg-white, .print-area .bg-gray-800 { 
            background: transparent !important; 
            border: 1px solid #ccc !important;
            margin: 4px 0 !important;
            padding: 8px !important;
          }
          .print-area .space-y-6 > * + * { margin-top: 8px !important; }
          .print-area .space-y-4 > * + * { margin-top: 4px !important; }
          .print-area .p-6 { padding: 6px !important; }
          .print-area .p-4 { padding: 4px !important; }
          .print-area .mb-4 { margin-bottom: 4px !important; }
          .print-area .mt-2 { margin-top: 2px !important; }
          
          @page { 
            margin: 0.3in; 
            size: letter;
          }
        }
      </style>
    `;
    const existingStyles = document.head.querySelector('#daily-round-print-styles');
    if (!existingStyles) {
      document.head.insertAdjacentHTML('beforeend', printStyles.replace('<style>', '<style id="daily-round-print-styles">'));
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
  const [templateType, setTemplateType] = useState('unit_manager');
  const [unit, setUnit] = useState('General');
  const [shift, setShift] = useState<'7a-3p' | '3p-11p' | '11p-7a'>('7a-3p');
  const [residentAcuity, setResidentAcuity] = useState<'low' | 'medium' | 'high'>('medium');
  const [aiCustomize, setAiCustomize] = useState(false);
  const [specialFocusAreas, setSpecialFocusAreas] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomRoundItem[]>([]);
  const [includeDate, setIncludeDate] = useState(false);
  const [customDate, setCustomDate] = useState('');

  const templateOptions = [
    { value: 'unit_manager', label: 'Unit Manager', description: 'Comprehensive facility oversight and compliance' },
    { value: 'charge_nurse', label: 'Charge Nurse', description: 'Nursing supervision and patient care coordination' },
    { value: 'director_of_nursing', label: 'Director of Nursing', description: 'Strategic nursing leadership and quality oversight' },
    { value: 'general_management', label: 'General Management', description: 'Administrative oversight and facility operations' },
  ];

  const focusAreaOptions = [
    'Infection Control', 'Fall Prevention', 'Medication Safety', 'Wound Care',
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
    try {
      setLoading(true);
      
      // Send the round data to AI for PDF generation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch('/api/daily-rounds/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          roundData: round,
          format: 'single-page',
          includeDate,
          customDate: customDate || new Date().toLocaleDateString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Download the PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-rounds-${round.unit}-${round.shift}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCreateTab = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Select Round Template</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templateOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setTemplateType(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                templateType === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{option.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Round Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="e.g., ICU, Medical, Dementia"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="7a-3p">Day Shift (7a-3p)</option>
              <option value="3p-11p">Evening Shift (3p-11p)</option>
              <option value="11p-7a">Night Shift (11p-7a)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resident Acuity</label>
            <select
              value={residentAcuity}
              onChange={(e) => setResidentAcuity(e.target.value as any)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="low">Low Acuity</option>
              <option value="medium">Medium Acuity</option>
              <option value="high">High Acuity</option>
            </select>
          </div>
        </div>
        
        {/* Date Option */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">PDF Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeDate"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="includeDate" className="text-sm text-gray-900 dark:text-gray-100">
                Include specific date on PDF (instead of "Generated" date)
              </label>
            </div>
            {includeDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date for Rounds
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={new Date().toLocaleDateString()}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to use today's date ({new Date().toLocaleDateString()})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Customization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Customization</h3>
        </div>
        
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={aiCustomize}
            onChange={(e) => setAiCustomize(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-900 dark:text-gray-100">Add AI-generated items based on special focus areas</span>
        </label>
        
        {aiCustomize && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select areas that need special attention to get customized round items:
              </p>
              <button
                type="button"
                onClick={() => {
                  if (specialFocusAreas.length === focusAreaOptions.length) {
                    setSpecialFocusAreas([]);
                  } else {
                    setSpecialFocusAreas([...focusAreaOptions]);
                  }
                }}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {specialFocusAreas.length === focusAreaOptions.length ? 'Deselect All' : 'Select All'}
              </button>
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
                  <span className="text-sm text-gray-900 dark:text-gray-100">{area}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Custom Round Items</h3>
          <button
            onClick={addCustomItem}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </button>
        </div>
        
        {customItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No custom items added. Click "Add Custom Item" to create facility-specific round items.
          </p>
        ) : (
          <div className="space-y-4">
            {customItems.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Task</label>
                    <input
                      type="text"
                      value={item.task}
                      onChange={(e) => updateCustomItem(index, 'task', e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Enter task description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => updateCustomItem(index, 'category', e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Category"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      value={item.priority}
                      onChange={(e) => updateCustomItem(index, 'priority', e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => removeCustomItem(index)}
                      className="p-2 text-red-600 hover:text-red-800 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                    <span className="text-sm text-gray-900 dark:text-gray-100">Compliance Related</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={generateRound}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </button>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Daily Rounds</h3>
            <button
              onClick={loadRecentRounds}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentRounds.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p>No daily rounds generated yet.</p>
              <p className="text-sm">Create your first round to see history here.</p>
            </div>
          ) : (
            recentRounds.map((round) => (
              <div key={round.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{round.title}</h4>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
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
                    <button
                      onClick={() => {
                        setCurrentRound(round);
                        setShowRoundView(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => generatePDF(round)}
                      className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderRoundView = () => {
    if (!currentRound) return null;

    const categorizedItems = currentRound.items.reduce((acc, item) => {
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
              <span>{currentRound.items.length} Items</span>
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
      <div className="bg-gradient-to-r from-green-600/90 to-green-700/90 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          Daily Round Generator
        </h1>
        <p className="text-green-100">
          Generate customizable daily round checklists for unit managers and nursing staff with compliance focus.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Round
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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