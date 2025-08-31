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
      // Mock data since task management tables don't exist yet
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Complete Monthly Fire Drill',
          description: 'Conduct mandatory fire safety drill for all residents and staff',
          status: 'pending',
          priority: 'high',
          category: 'compliance',
          assigned_to: 'Safety Officer',
          assigned_by: 'Administrator',
          due_date: '2025-01-05',
          created_at: '2024-12-20',
          automated: true,
          recurring: {
            frequency: 'monthly',
            next_due: '2025-02-05'
          }
        },
        {
          id: '2',
          title: 'Investigate Fall Incident - Room 205',
          description: 'Complete investigation for resident fall incident reported this morning',
          status: 'in_progress',
          priority: 'urgent',
          category: 'clinical',
          assigned_to: 'DON',
          assigned_by: 'Administrator',
          due_date: '2024-12-31',
          created_at: '2024-12-30',
          automated: false,
          workflow_step: 2
        },
        {
          id: '3',
          title: 'Update Emergency Contact Information',
          description: 'Annual review and update of all resident emergency contacts',
          status: 'completed',
          priority: 'medium',
          category: 'administrative',
          assigned_to: 'Social Worker',
          assigned_by: 'Administrator',
          due_date: '2024-12-25',
          created_at: '2024-12-15',
          completed_at: '2024-12-24',
          automated: false
        }
      ];

      setTasks(mockTasks);
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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Automated Workflows
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Zap className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {workflow.name}
                </h4>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {workflow.description}
              </p>
              
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trigger: 
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                  {workflow.trigger}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Workflow Steps:
                </span>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {workflow.steps.map((step: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="px-3 py-1 bg-green-100 text-green-600 hover:bg-green-200 rounded text-sm font-medium transition-colors">
                  Active
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}