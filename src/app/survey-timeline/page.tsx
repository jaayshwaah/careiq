"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Calendar, CheckCircle, Clock, AlertTriangle, Users, FileText, Shield, Target, Plus, Edit } from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  category: 'preparation' | 'documentation' | 'training' | 'review' | 'compliance';
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string[];
  due_date: string;
  estimated_hours: number;
  completion_percentage: number;
  dependencies: string[];
  resources: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

interface SurveyInfo {
  facility_name: string;
  last_survey_date: string;
  next_expected_date: string;
  window_start: string;
  window_end: string;
  survey_type: 'standard' | 'complaint' | 'life_safety' | 'recert';
  days_until_window: number;
  in_window: boolean;
}

const TIMELINE_CATEGORIES = [
  { value: 'preparation', label: 'Preparation', icon: '📋', color: 'blue' },
  { value: 'documentation', label: 'Documentation', icon: '📄', color: 'green' },
  { value: 'training', label: 'Training', icon: '🎓', color: 'purple' },
  { value: 'review', label: 'Review', icon: '🔍', color: 'orange' },
  { value: 'compliance', label: 'Compliance', icon: '✅', color: 'red' }
];

const DEFAULT_TIMELINE_ITEMS: Omit<TimelineItem, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Review and Update Policies & Procedures',
    description: 'Ensure all policies are current and compliant with latest CMS regulations',
    category: 'preparation',
    status: 'not_started',
    priority: 'high',
    assigned_to: ['Administrator', 'DON'],
    due_date: '',
    estimated_hours: 16,
    completion_percentage: 0,
    dependencies: [],
    resources: ['CMS Manual', 'State Regulations', 'Policy Templates'],
    notes: ''
  },
  {
    title: 'Conduct Mock Survey Training',
    description: 'Train all department heads on survey process and F-tag requirements',
    category: 'training',
    status: 'not_started',
    priority: 'critical',
    assigned_to: ['DON', 'Training Coordinator'],
    due_date: '',
    estimated_hours: 8,
    completion_percentage: 0,
    dependencies: [],
    resources: ['Mock Survey Materials', 'F-tag Reference Guide'],
    notes: ''
  },
  {
    title: 'Complete Resident Care Plan Audit',
    description: 'Review all active care plans for compliance and accuracy',
    category: 'documentation',
    status: 'not_started',
    priority: 'high',
    assigned_to: ['DON', 'MDS Coordinator'],
    due_date: '',
    estimated_hours: 24,
    completion_percentage: 0,
    dependencies: [],
    resources: ['Care Plan Audit Checklist', 'MDS Reports'],
    notes: ''
  },
  {
    title: 'Medication Administration Record (MAR) Review',
    description: 'Audit MAR documentation for accuracy and completeness',
    category: 'compliance',
    status: 'not_started',
    priority: 'critical',
    assigned_to: ['DON', 'Pharmacy Consultant'],
    due_date: '',
    estimated_hours: 12,
    completion_percentage: 0,
    dependencies: [],
    resources: ['MAR Audit Tool', 'Pharmacy Reports'],
    notes: ''
  },
  {
    title: 'Infection Control Program Review',
    description: 'Review IPCP, surveillance data, and outbreak response plans',
    category: 'compliance',
    status: 'not_started',
    priority: 'high',
    assigned_to: ['IPCP', 'DON'],
    due_date: '',
    estimated_hours: 6,
    completion_percentage: 0,
    dependencies: [],
    resources: ['IPCP Manual', 'Surveillance Reports', 'CDC Guidelines'],
    notes: ''
  },
  {
    title: 'Staff Training Documentation Audit',
    description: 'Verify all required staff training is current and documented',
    category: 'documentation',
    status: 'not_started',
    priority: 'medium',
    assigned_to: ['HR Manager', 'Training Coordinator'],
    due_date: '',
    estimated_hours: 8,
    completion_percentage: 0,
    dependencies: [],
    resources: ['Training Records', 'Competency Checklists'],
    notes: ''
  }
];

export default function SurveyTimeline() {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [surveyInfo, setSurveyInfo] = useState<SurveyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);

  const supabase = getBrowserSupabase();

  const loadSurveyData = async () => {
    try {
      // Load survey preparation progress from the user's profile and survey_prep_progress table
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data: progress, error } = await supabase
        .from('survey_prep_progress')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && progress) {
        // Calculate survey timeline based on expected survey date
        const expectedDate = new Date(progress.expected_survey_date);
        const windowStart = new Date(expectedDate);
        windowStart.setMonth(expectedDate.getMonth() - 3); // 3 months before
        
        const windowEnd = new Date(expectedDate);
        windowEnd.setMonth(expectedDate.getMonth() + 3); // 3 months after
        
        const now = new Date();
        const daysUntilWindow = Math.ceil((windowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const inWindow = now >= windowStart && now <= windowEnd;

        setSurveyInfo({
          facility_name: 'Current Facility',
          last_survey_date: '2023-08-15', // This would come from actual data
          next_expected_date: progress.expected_survey_date,
          window_start: windowStart.toISOString().split('T')[0],
          window_end: windowEnd.toISOString().split('T')[0],
          survey_type: progress.survey_type || 'standard',
          days_until_window: daysUntilWindow,
          in_window: inWindow
        });

        // Generate timeline items with appropriate due dates
        const items: TimelineItem[] = DEFAULT_TIMELINE_ITEMS.map((template, index) => {
          // Stagger due dates based on priority and dependencies
          let dueDaysFromWindow = -90; // Default: 90 days before window
          if (template.priority === 'critical') dueDaysFromWindow = -120;
          else if (template.priority === 'high') dueDaysFromWindow = -90;
          else if (template.priority === 'medium') dueDaysFromWindow = -60;
          else dueDaysFromWindow = -30;

          const dueDate = new Date(windowStart);
          dueDate.setDate(dueDate.getDate() + dueDaysFromWindow);

          return {
            ...template,
            id: `timeline-${index + 1}`,
            due_date: dueDate.toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        setTimelineItems(items);
      } else {
        // No survey data found - create mock data for demonstration
        setSurveyInfo({
          facility_name: 'Demo Facility',
          last_survey_date: '2023-08-15',
          next_expected_date: '2025-08-15',
          window_start: '2025-05-15',
          window_end: '2025-11-15',
          survey_type: 'standard',
          days_until_window: 150,
          in_window: false
        });

        // Generate timeline with mock dates
        const baseDate = new Date('2025-05-15'); // Window start
        const items: TimelineItem[] = DEFAULT_TIMELINE_ITEMS.map((template, index) => {
          let dueDaysFromWindow = -90;
          if (template.priority === 'critical') dueDaysFromWindow = -120;
          else if (template.priority === 'high') dueDaysFromWindow = -90;
          else if (template.priority === 'medium') dueDaysFromWindow = -60;
          else dueDaysFromWindow = -30;

          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + dueDaysFromWindow);

          return {
            ...template,
            id: `timeline-${index + 1}`,
            due_date: dueDate.toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        setTimelineItems(items);
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveyData();
  }, []);

  const filteredItems = timelineItems.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const handleUpdateProgress = async (itemId: string, percentage: number) => {
    setTimelineItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            completion_percentage: percentage,
            status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
            updated_at: new Date().toISOString()
          }
        : item
    ));
  };

  const getStatusIcon = (status: TimelineItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'overdue': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: TimelineItem['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getOverallProgress = () => {
    const totalItems = timelineItems.length;
    const completedItems = timelineItems.filter(item => item.status === 'completed').length;
    const avgProgress = timelineItems.reduce((sum, item) => sum + item.completion_percentage, 0) / totalItems;
    
    return {
      completed: completedItems,
      total: totalItems,
      percentage: Math.round(avgProgress)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading survey timeline...</p>
        </div>
      </div>
    );
  }

  const progress = getOverallProgress();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Survey Preparation Timeline</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your facility's survey readiness and preparation progress
            </p>
          </div>
          
          <button
            onClick={() => setShowNewItemModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Survey Overview */}
        {surveyInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Survey Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Next Expected Survey</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {new Date(surveyInfo.next_expected_date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Survey Window</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(surveyInfo.window_start).toLocaleDateString()} - {new Date(surveyInfo.window_end).toLocaleDateString()}
                </div>
                <div className={`text-lg font-bold ${surveyInfo.in_window ? 'text-red-600' : 'text-orange-600'}`}>
                  {surveyInfo.in_window ? '🚨 Window Open' : `${surveyInfo.days_until_window} days to window`}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Preparation Progress</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {progress.percentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.completed}/{progress.total} tasks completed
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Survey Type</span>
                </div>
                <div className="text-lg font-bold text-purple-600 capitalize">
                  {surveyInfo.survey_type}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Tasks ({timelineItems.length})
          </button>
          {TIMELINE_CATEGORIES.map(category => {
            const count = timelineItems.filter(item => item.category === category.value).length;
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.icon} {category.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Timeline Items */}
        <div className="space-y-4">
          {filteredItems
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 p-6 ${
                item.priority === 'critical' ? 'border-l-red-500' :
                item.priority === 'high' ? 'border-l-orange-500' :
                item.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-gray-500'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {item.description}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(item.due_date).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.assigned_to.join(', ')}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Time</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.estimated_hours} hours
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.completion_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${item.completion_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateProgress(item.id, 0)}
                  className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-sm"
                  disabled={item.completion_percentage === 0}
                >
                  Not Started
                </button>
                <button
                  onClick={() => handleUpdateProgress(item.id, 50)}
                  className="px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-sm"
                  disabled={item.completion_percentage === 50}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateProgress(item.id, 100)}
                  className="px-3 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded text-sm"
                  disabled={item.completion_percentage === 100}
                >
                  Completed
                </button>
              </div>

              {/* Resources */}
              {item.resources.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-1 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.resources.map((resource, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modals would go here */}
        {showNewItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New Timeline Task</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400">Task creation form would be implemented here.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowNewItemModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}