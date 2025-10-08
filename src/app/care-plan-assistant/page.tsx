"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { FileText, Plus, Search, Filter, Download, CheckCircle, Clock, AlertCircle, User, Calendar, Stethoscope, Brain, Heart, Users } from 'lucide-react';

interface CareGoal {
  id: string;
  goal_text: string;
  target_date: string;
  status: 'active' | 'met' | 'discontinued';
  progress_notes: string[];
  interventions: string[];
}

interface CarePlan {
  id: string;
  resident_name: string;
  resident_id: string;
  plan_type: string;
  diagnosis: string[];
  care_goals: CareGoal[];
  medications: string[];
  allergies: string[];
  diet_restrictions: string[];
  mobility_status: string;
  cognitive_status: string;
  last_updated: string;
  next_review: string;
  created_by: string;
  status: 'active' | 'pending' | 'archived';
}

const CARE_PLAN_TEMPLATES = [
  {
    id: 'fall-prevention',
    name: 'Fall Prevention',
    icon: '🛡️',
    description: 'Comprehensive fall risk assessment and prevention strategies',
    goals: [
      'Maintain safe mobility with assistance',
      'Reduce fall risk through environmental modifications',
      'Educate resident and family on fall prevention strategies'
    ],
    interventions: [
      'Regular fall risk assessments',
      'Environmental safety checks',
      'Physical therapy evaluation',
      'Medication review for dizziness/sedation'
    ]
  },
  {
    id: 'diabetes-management',
    name: 'Diabetes Management',
    icon: '🩺',
    description: 'Blood sugar monitoring and diabetic care coordination',
    goals: [
      'Maintain blood glucose within target range',
      'Prevent diabetic complications',
      'Educate on diabetic diet compliance'
    ],
    interventions: [
      'Regular blood glucose monitoring',
      'Diabetic diet adherence',
      'Foot care and inspection',
      'Endocrinologist consultation as needed'
    ]
  },
  {
    id: 'dementia-care',
    name: 'Dementia/Cognitive Care',
    icon: '🧠',
    description: 'Person-centered dementia care and behavioral interventions',
    goals: [
      'Maintain highest level of cognitive function',
      'Ensure safety and dignity',
      'Minimize behavioral disturbances'
    ],
    interventions: [
      'Cognitive stimulation activities',
      'Structured daily routines',
      'Behavioral monitoring and interventions',
      'Family education and support'
    ]
  },
  {
    id: 'wound-care',
    name: 'Wound Care',
    icon: '🩹',
    description: 'Pressure ulcer prevention and wound healing protocols',
    goals: [
      'Prevent new pressure ulcers',
      'Promote healing of existing wounds',
      'Maintain skin integrity'
    ],
    interventions: [
      'Regular skin assessments',
      'Pressure redistribution',
      'Wound dressing changes per protocol',
      'Nutritional support for healing'
    ]
  }
];

const DISCIPLINES = [
  { value: 'nursing', label: 'Nursing', icon: '👩‍⚕️' },
  { value: 'physical_therapy', label: 'Physical Therapy', icon: '🏃‍♂️' },
  { value: 'occupational_therapy', label: 'Occupational Therapy', icon: '🖐️' },
  { value: 'speech_therapy', label: 'Speech Therapy', icon: '🗣️' },
  { value: 'social_work', label: 'Social Work', icon: '🤝' },
  { value: 'dietary', label: 'Dietary', icon: '🍎' },
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { value: 'physician', label: 'Physician', icon: '👨‍⚕️' }
];

export default function CarePlans() {
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CarePlan | null>(null);

  const supabase = getBrowserSupabase();

  const loadCarePlans = async () => {
    try {
      // For now, start with empty care plans array
      // In the future, this would fetch from /api/care-plans
      setCarePlans([]);
    } catch (error) {
      console.error('Error loading care plans:', error);
      setCarePlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarePlans();
  }, []);

  const filteredPlans = carePlans.filter(plan => {
    const matchesSearch = plan.resident_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plan.resident_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || plan.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleCreateFromTemplate = async (template: any) => {
    try {
      console.log('Creating care plan from template:', template.name);
      setShowNewPlanModal(true);
      // Implementation would create a new care plan based on the template
    } catch (error) {
      console.error('Error creating care plan:', error);
    }
  };

  const handleUpdateGoal = async (planId: string, goalId: string, updates: any) => {
    try {
      setCarePlans(prev => prev.map(plan => 
        plan.id === planId ? {
          ...plan,
          care_goals: plan.care_goals.map(goal =>
            goal.id === goalId ? { ...goal, ...updates } : goal
          )
        } : plan
      ));
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Care Plans...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Care Plans</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered care planning and clinical documentation
            </p>
          </div>
          
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Care Plan
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search residents or care plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Care Plan Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CARE_PLAN_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCreateFromTemplate(template)}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {template.description}
                </p>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {template.goals.length} goals • {template.interventions.length} interventions
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Care Plans List */}
        <div className="space-y-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
            >
              {/* Plan Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {plan.resident_name}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ID: {plan.resident_id}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.status === 'active' ? 'bg-green-100 text-green-800' :
                      plan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {plan.plan_type}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Review: {new Date(plan.next_review).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {plan.created_by}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                >
                  View Details
                </button>
              </div>

              {/* Diagnoses */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Primary Diagnoses</h4>
                <div className="flex flex-wrap gap-2">
                  {plan.diagnosis.map((dx, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm"
                    >
                      {dx}
                    </span>
                  ))}
                </div>
              </div>

              {/* Care Goals */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Active Care Goals</h4>
                <div className="space-y-2">
                  {plan.care_goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {goal.goal_text}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {goal.status === 'met' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : goal.status === 'discontinued' ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                        
                        <select
                          value={goal.status}
                          onChange={(e) => handleUpdateGoal(plan.id, goal.id, { status: e.target.value })}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        >
                          <option value="active">Active</option>
                          <option value="met">Met</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{plan.care_goals.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Active Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{plan.medications.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Medications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{plan.diagnosis.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Diagnoses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.floor((new Date(plan.next_review).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Days to Review</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Care Plan Modal */}
        {showNewPlanModal && (
          <NewCarePlanModal
            onClose={() => setShowNewPlanModal(false)}
            onSave={(planData) => {
              console.log('Saving care plan:', planData);
              setShowNewPlanModal(false);
            }}
          />
        )}

        {/* Plan Details Modal */}
        {selectedPlan && (
          <PlanDetailsModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onUpdate={(updates) => {
              setCarePlans(prev => prev.map(p => 
                p.id === selectedPlan.id ? { ...p, ...updates } : p
              ));
              setSelectedPlan(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewCarePlanModal({ onClose, onSave }: { 
  onClose: () => void; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    resident_name: '',
    resident_id: '',
    plan_type: 'Comprehensive',
    diagnosis: '',
    mobility_status: '',
    cognitive_status: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      diagnosis: formData.diagnosis.split(',').map(d => d.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Care Plan
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resident Name
              </label>
              <input
                type="text"
                value={formData.resident_name}
                onChange={(e) => setFormData({...formData, resident_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resident ID
              </label>
              <input
                type="text"
                value={formData.resident_id}
                onChange={(e) => setFormData({...formData, resident_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plan Type
            </label>
            <select
              value={formData.plan_type}
              onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="Comprehensive">Comprehensive Care Plan</option>
              <option value="Fall Prevention">Fall Prevention</option>
              <option value="Diabetes Management">Diabetes Management</option>
              <option value="Dementia Care">Dementia Care</option>
              <option value="Wound Care">Wound Care</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Primary Diagnoses (comma-separated)
            </label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="e.g., Diabetes Type 2, Hypertension, Dementia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobility Status
              </label>
              <input
                type="text"
                value={formData.mobility_status}
                onChange={(e) => setFormData({...formData, mobility_status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Ambulatory with walker"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cognitive Status
              </label>
              <input
                type="text"
                value={formData.cognitive_status}
                onChange={(e) => setFormData({...formData, cognitive_status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Alert and oriented x3"
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
              Create Care Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanDetailsModal({ plan, onClose, onUpdate }: { 
  plan: CarePlan; 
  onClose: () => void; 
  onUpdate: (data: any) => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Care Plan Details - {plan.resident_name}
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
          {/* Basic Information */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Resident ID:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{plan.resident_id}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Plan Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{plan.plan_type}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Mobility:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{plan.mobility_status}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Cognitive Status:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{plan.cognitive_status}</span>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Medications</h4>
            <div className="space-y-2">
              {plan.medications.map((med, index) => (
                <div key={index} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-900 dark:text-white">{med}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Allergies</h4>
            <div className="flex flex-wrap gap-2">
              {plan.allergies.map((allergy, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                  {allergy}
                </span>
              ))}
            </div>
          </div>

          {/* Care Goals Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Care Goals & Interventions</h4>
            <div className="space-y-4">
              {plan.care_goals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white">{goal.goal_text}</h5>
                    <span className={`px-2 py-1 rounded text-xs ${
                      goal.status === 'met' ? 'bg-green-100 text-green-800' :
                      goal.status === 'discontinued' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Target Date: {new Date(goal.target_date).toLocaleDateString()}
                  </p>

                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Interventions:</h6>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {goal.interventions.map((intervention, index) => (
                        <li key={index}>{intervention}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Progress Notes:</h6>
                    <div className="space-y-1">
                      {goal.progress_notes.map((note, index) => (
                        <p key={index} className="text-sm text-gray-600 dark:text-gray-400">• {note}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Export functionality would go here
                alert('Export functionality would be implemented here');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => {
                // Edit functionality would go here  
                alert('Edit functionality would be implemented here');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}