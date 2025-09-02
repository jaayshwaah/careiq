"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Plus, CheckCircle, Clock, AlertTriangle, User, Calendar, Filter, MoreHorizontal, Bell, Repeat, Zap } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  automated: boolean;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    next_due: string;
  };
  workflow_step?: number;
  dependencies?: string[];
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_duration: string;
  steps: string[];
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

const TASK_CATEGORIES = [
  { value: 'compliance', label: 'Compliance', icon: '📋', color: 'blue' },
  { value: 'clinical', label: 'Clinical Care', icon: '🏥', color: 'green' },
  { value: 'administrative', label: 'Administrative', icon: '📊', color: 'purple' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'orange' },
  { value: 'training', label: 'Training', icon: '🎓', color: 'indigo' },
  { value: 'quality', label: 'Quality Improvement', icon: '📈', color: 'pink' }
];

const AUTOMATED_WORKFLOWS = [
  {
    id: 'daily-census',
    name: 'Daily Census Reporting',
    description: 'Automated daily census collection and reporting workflow',
    trigger: 'daily at 6:00 AM',
    steps: [
      'Collect census data from EHR',
      'Validate occupancy numbers',
      'Generate daily census report',
      'Send to administration team',
      'Update dashboard metrics'
    ]
  },
  {
    id: 'survey-prep-reminder',
    name: 'Survey Preparation Reminders',
    description: 'Automated reminders for upcoming survey windows',
    trigger: 'based on survey window dates',
    steps: [
      'Check survey window calendar',
      'Generate preparation checklist',
      'Assign tasks to department heads',
      'Send reminder notifications',
      'Schedule mock survey training'
    ]
  },
  {
    id: 'medication-review',
    name: 'Monthly Medication Review',
    description: 'Automated medication review cycle for residents',
    trigger: 'monthly on 1st',
    steps: [
      'Generate resident medication lists',
      'Assign to pharmacy consultant',
      'Schedule physician reviews',
      'Update care plans as needed',
      'Document review completion'
    ]
  }
];

const TASK_TEMPLATES = [
  {
    id: 'incident-investigation',
    name: 'Incident Investigation',
    description: 'Complete investigation and documentation for incident reports',
    category: 'compliance',
    priority: 'high' as const,
    estimated_duration: '2-4 hours',
    steps: [
      'Review incident details',
      'Interview witnesses',
      'Document findings',
      'Develop corrective action plan',
      'Submit final report'
    ],
    recurring: false
  },
  {
    id: 'fire-drill',
    name: 'Monthly Fire Drill',
    description: 'Conduct mandatory monthly fire safety drill',
    category: 'compliance',
    priority: 'high' as const,
    estimated_duration: '30 minutes',
    steps: [
      'Schedule drill with all departments',
      'Conduct fire drill',
      'Document evacuation times',
      'Note any issues or delays',
      'Submit compliance report'
    ],
    recurring: true,
    frequency: 'monthly' as const
  },
  {
    id: 'care-plan-review',
    name: 'Quarterly Care Plan Review',
    description: 'Review and update resident care plans',
    category: 'clinical',
    priority: 'medium' as const,
    estimated_duration: '1 hour per resident',
    steps: [
      'Review current care plan',
      'Assess resident progress',
      'Update goals and interventions',
      'Coordinate with care team',
      'Document changes'
    ],
    recurring: true,
    frequency: 'monthly' as const
  }
];

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const supabase = getBrowserSupabase();

  const loadTasks = async () => {
    try {
      // TODO: Load tasks from database when task management tables are implemented
      const tasks: Task[] = [];
      setTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const categoryMatch = filterCategory === 'all' || task.category === filterCategory;
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const newTask: Task = {
        id: Date.now().toString(),
        title: taskData.title || '',
        description: taskData.description || '',
        status: 'pending',
        priority: taskData.priority || 'medium',
        category: taskData.category || 'administrative',
        assigned_to: taskData.assigned_to || '',
        assigned_by: 'Current User',
        due_date: taskData.due_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        automated: false
      };

      setTasks(prev => [newTask, ...prev]);
      setShowNewTaskModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined
            }
          : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateFromTemplate = async (template: TaskTemplate) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: template.name,
      description: template.description,
      status: 'pending',
      priority: template.priority,
      category: template.category,
      assigned_to: 'Unassigned',
      assigned_by: 'System',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
      created_at: new Date().toISOString(),
      automated: template.recurring,
      ...(template.recurring && template.frequency && {
        recurring: {
          frequency: template.frequency,
          next_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      })
    };

    setTasks(prev => [newTask, ...prev]);
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automated workflows and task tracking for healthcare compliance
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowWorkflowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Workflows
            </button>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {TASK_CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tasks.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Priority</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.automated).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Automated</div>
          </div>
        </div>

        {/* Task Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Create Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TASK_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCreateFromTemplate(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  {template.recurring && <Repeat className="h-4 w-4 text-purple-600" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {template.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(template.priority)}`}>
                    {template.priority}
                  </span>
                  <span className="text-xs text-gray-500">{template.estimated_duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Tasks ({filteredTasks.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {task.title}
                        </h3>
                        {task.automated && <Zap className="h-4 w-4 text-purple-600" />}
                        {task.recurring && <Repeat className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {task.assigned_to}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      TASK_CATEGORIES.find(c => c.value === task.category)?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      TASK_CATEGORIES.find(c => c.value === task.category)?.color === 'green' ? 'bg-green-100 text-green-800' :
                      TASK_CATEGORIES.find(c => c.value === task.category)?.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                    </div>
                  </div>

                  {task.status !== 'completed' && (
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                          className="px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                        className="px-3 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded text-xs font-medium transition-colors"
                      >
                        Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Task Modal */}
        {showNewTaskModal && (
          <NewTaskModal
            onClose={() => setShowNewTaskModal(false)}
            onCreate={handleCreateTask}
          />
        )}

        {/* Workflow Modal */}
        {showWorkflowModal && (
          <WorkflowModal
            workflows={AUTOMATED_WORKFLOWS}
            onClose={() => setShowWorkflowModal(false)}
          />
        )}
      </div>
    </div>
  );
}

function NewTaskModal({ onClose, onCreate }: { 
  onClose: () => void; 
  onCreate: (task: Partial<Task>) => void; 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'administrative',
    priority: 'medium' as Task['priority'],
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Task
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {TASK_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign To
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Person or role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkflowModal({ workflows, onClose }: { 
  workflows: any[]; 
  onClose: () => void; 
}) {
  const [currentView, setCurrentView] = useState<'templates' | 'builder'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);

  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setWorkflowName(template.name);
    setWorkflowDescription(template.description);
    setWorkflowSteps(template.steps.map((step: string, index: number) => ({
      id: index + 1,
      type: 'action',
      title: step,
      description: '',
      settings: {}
    })));
    setCurrentView('builder');
  };

  const addWorkflowStep = (type: 'action' | 'condition' | 'delay' | 'notification') => {
    const newStep = {
      id: Date.now(),
      type,
      title: `New ${type}`,
      description: '',
      settings: {}
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  if (currentView === 'builder') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <button
                  onClick={() => setCurrentView('templates')}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
                >
                  ← Back to Templates
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Workflow Builder
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Design intelligent automation workflows
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Plus className="h-6 w-6 rotate-45 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Main Canvas */}
            <div className="flex-1 flex flex-col">
              {/* Canvas Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="Workflow name..."
                      className="text-lg font-semibold bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
                      Save Draft
                    </button>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                      Publish Workflow
                    </button>
                  </div>
                </div>
              </div>

              {/* Workflow Canvas */}
              <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/50 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  {/* Start Node */}
                  <div className="flex flex-col items-center space-y-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl border-2 border-green-300 dark:border-green-700">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                    
                    {/* Workflow Steps */}
                    {workflowSteps.length === 0 ? (
                      <>
                        <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                        <div className="w-full max-w-lg">
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center">
                            <div className="flex flex-col items-center space-y-4">
                              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                <Plus className="h-8 w-8 text-gray-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                  Add Your First Step
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                  Build your workflow by adding actions and conditions
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <button 
                                    onClick={() => addWorkflowStep('action')}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <CheckSquare className="h-4 w-4" />
                                    Action
                                  </button>
                                  <button 
                                    onClick={() => addWorkflowStep('condition')}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    Condition
                                  </button>
                                  <button 
                                    onClick={() => addWorkflowStep('delay')}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    <Clock className="h-4 w-4" />
                                    Delay
                                  </button>
                                  <button 
                                    onClick={() => addWorkflowStep('notification')}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    <Bell className="h-4 w-4" />
                                    Notify
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {workflowSteps.map((step, index) => (
                          <div key={step.id} className="flex flex-col items-center space-y-4">
                            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                            <div className="w-full max-w-lg">
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`p-2 rounded-lg ${
                                    step.type === 'action' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                    step.type === 'condition' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                                    step.type === 'delay' ? 'bg-purple-100 dark:bg-purple-900/20' :
                                    'bg-green-100 dark:bg-green-900/20'
                                  }`}>
                                    {step.type === 'action' && <CheckSquare className="h-4 w-4 text-blue-600" />}
                                    {step.type === 'condition' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                                    {step.type === 'delay' && <Clock className="h-4 w-4 text-purple-600" />}
                                    {step.type === 'notification' && <Bell className="h-4 w-4 text-green-600" />}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {step.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                      {step.type} Step
                                    </p>
                                  </div>
                                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                        <button
                          onClick={() => addWorkflowStep('action')}
                          className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors"
                        >
                          <Plus className="h-5 w-5 text-gray-400" />
                        </button>
                      </>
                    )}

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                    
                    {/* End Node */}
                    <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Panel */}
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Workflow Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe what this workflow does..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trigger Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                    <option>Manual Start</option>
                    <option>Scheduled (Daily)</option>
                    <option>Scheduled (Weekly)</option>
                    <option>Scheduled (Monthly)</option>
                    <option>Event-based</option>
                    <option>Conditional</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Enable notifications
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Allow manual override
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Templates View
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full h-[80vh] flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Workflow Templates
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Start with a pre-built template or create from scratch
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <Plus className="h-6 w-6 rotate-45 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <button
              onClick={() => setCurrentView('builder')}
              className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-2xl group-hover:bg-blue-200 transition-colors">
                  <Plus className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Create from Scratch
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Build a custom workflow with our visual designer
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Pre-built Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflows.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
                  onClick={() => handleUseTemplate(template)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl group-hover:bg-purple-200 transition-colors">
                      <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.steps.length} steps
                        </div>
                        <div className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          {template.trigger}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preview steps:</div>
                    <div className="space-y-1">
                      {template.steps.slice(0, 3).map((step: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                            {index + 1}
                          </div>
                          <span className="text-gray-600 dark:text-gray-400 truncate">{step}</span>
                        </div>
                      ))}
                      {template.steps.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          +{template.steps.length - 3} more steps
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}