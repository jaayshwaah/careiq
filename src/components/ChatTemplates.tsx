"use client";

import { useState } from 'react';
import { FileText, ChevronRight, Star, Clock, Users, Shield, Calendar, BookOpen } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'survey' | 'training' | 'policy' | 'incident' | 'general';
  icon: React.ComponentType<any>;
  color: string;
  popular?: boolean;
}

interface ChatTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  onClose: () => void;
}

const templates: Template[] = [
  {
    id: 'survey-prep',
    title: 'State Survey Preparation',
    description: 'Complete checklist for upcoming state survey',
    prompt: 'Help me prepare for an upcoming state survey. Create a comprehensive checklist covering all major areas including resident care, documentation, staff training, environment, and administration. Include timeline recommendations and key focus areas.',
    category: 'survey',
    icon: Shield,
    color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    popular: true
  },
  {
    id: 'training-plan',
    title: 'Staff Training Plan',
    description: 'Create monthly training schedule and materials',
    prompt: 'Create a comprehensive monthly staff training plan for our nursing home. Include mandatory training topics, scheduling recommendations, and suggest interactive training methods. Focus on regulatory compliance and best practices.',
    category: 'training',
    icon: Users,
    color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
    popular: true
  },
  {
    id: 'incident-investigation',
    title: 'Incident Investigation',
    description: 'Step-by-step incident investigation process',
    prompt: 'Guide me through a thorough incident investigation process. Include immediate response steps, documentation requirements, root cause analysis, and follow-up actions. Ensure compliance with regulatory reporting requirements.',
    category: 'incident',
    icon: FileText,
    color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
  },
  {
    id: 'policy-review',
    title: 'Policy Review & Update',
    description: 'Annual policy review and revision guidance',
    prompt: 'Help me conduct an annual review of our nursing home policies. Provide a systematic approach to evaluate current policies, identify areas needing updates, and ensure compliance with current regulations.',
    category: 'policy',
    icon: BookOpen,
    color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
  },
  {
    id: 'mds-assessment',
    title: 'MDS Assessment Guide',
    description: 'MDS completion and submission timeline',
    prompt: 'Provide a comprehensive guide for MDS assessments including timelines, documentation requirements, common errors to avoid, and submission deadlines. Include tips for accuracy and compliance.',
    category: 'general',
    icon: Calendar,
    color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400'
  },
  {
    id: 'infection-control',
    title: 'Infection Control Plan',
    description: 'Develop comprehensive infection control protocols',
    prompt: 'Create a detailed infection control plan for our facility. Include prevention strategies, outbreak response procedures, staff training requirements, and monitoring protocols. Ensure compliance with CDC and CMS guidelines.',
    category: 'policy',
    icon: Shield,
    color: 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400',
    popular: true
  },
  {
    id: 'quality-assurance',
    title: 'Quality Assurance Program',
    description: 'Implement systematic quality monitoring',
    prompt: 'Help me design a comprehensive Quality Assurance and Performance Improvement (QAPI) program. Include performance indicators, data collection methods, analysis procedures, and improvement action plans.',
    category: 'general',
    icon: Star,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
  },
  {
    id: 'emergency-preparedness',
    title: 'Emergency Preparedness',
    description: 'Emergency response planning and procedures',
    prompt: 'Develop an emergency preparedness plan covering natural disasters, power outages, and other emergencies. Include evacuation procedures, communication protocols, and staff responsibilities.',
    category: 'policy',
    icon: FileText,
    color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
  }
];

export default function ChatTemplates({ onSelectTemplate, onClose }: ChatTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Templates', count: templates.length },
    { id: 'survey', label: 'Survey Prep', count: templates.filter(t => t.category === 'survey').length },
    { id: 'training', label: 'Training', count: templates.filter(t => t.category === 'training').length },
    { id: 'policy', label: 'Policy', count: templates.filter(t => t.category === 'policy').length },
    { id: 'incident', label: 'Incident', count: templates.filter(t => t.category === 'incident').length },
    { id: 'general', label: 'General', count: templates.filter(t => t.category === 'general').length }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const popularTemplates = templates.filter(t => t.popular);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chat Templates</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Start with proven prompts for common nursing home tasks
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-96">
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <div className="space-y-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{category.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedCategory === category.id
                      ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Popular Templates */}
            {selectedCategory === 'all' && popularTemplates.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Most Popular
                </h3>
                <div className="space-y-1">
                  {popularTemplates.map(template => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => onSelectTemplate(template.prompt)}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} className="text-orange-500" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {template.title}
                          </span>
                          <Star size={12} className="text-orange-500 ml-auto" fill="currentColor" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map(template => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template.prompt)}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md group ${template.color}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{template.title}</h3>
                          {template.popular && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium mt-1">
                              <Star size={10} fill="currentColor" />
                              Popular
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm opacity-80 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs opacity-60">
                      <Clock size={12} />
                      <span>Ready to use</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}