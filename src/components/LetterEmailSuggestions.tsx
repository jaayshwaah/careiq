// src/components/LetterEmailSuggestions.tsx - AI-powered letter and email suggestions for healthcare compliance
"use client";

import { useState, useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { 
  Mail, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Save,
  RefreshCw,
  X,
  Search,
  Filter,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building
} from "lucide-react";

interface LetterTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'letter' | 'email';
  urgency: 'low' | 'medium' | 'high';
  recipient_type: string;
  tags: string[];
  description: string;
  compliance_areas: string[];
  created_at: string;
}

interface LetterEmailSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

const LETTER_CATEGORIES = [
  'Survey Response',
  'Deficiency Correction',
  'Incident Reporting',
  'Staff Communication',
  'Family Notification',
  'Regulatory Notice',
  'Policy Announcement',
  'Training Reminder',
  'Quality Improvement',
  'General Communication'
];

const RECIPIENT_TYPES = [
  'State Survey Agency',
  'CMS Regional Office',
  'Family Members',
  'Staff',
  'Medical Directors',
  'Corporate Office',
  'Vendors/Contractors',
  'Legal Counsel',
  'Insurance Company',
  'Other Facilities'
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low Priority', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { value: 'high', label: 'High Priority', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/20' }
];

export default function LetterEmailSuggestions({
  isOpen,
  onClose,
  initialContext = ''
}: LetterEmailSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'templates' | 'create'>('suggestions');
  const [suggestions, setSuggestions] = useState<LetterTemplate[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'letter' | 'email'>('all');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Create/Edit state
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [copied, setCopied] = useState<string>('');
  
  // Generation context
  const [context, setContext] = useState(initialContext);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [letterType, setLetterType] = useState<'letter' | 'email'>('email');
  
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (!isOpen) return;
    
    if (activeTab === 'suggestions') {
      loadSuggestions();
    } else if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [isOpen, activeTab]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Load AI-generated suggestions based on recent activity
      const response = await fetch('/api/letter-suggestions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/letter-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLetterSuggestions = async () => {
    if (!context.trim() || !selectedCategory || !selectedRecipient) return;

    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          context,
          category: selectedCategory,
          recipient_type: selectedRecipient,
          urgency: selectedUrgency,
          type: letterType
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          setSuggestions(prev => [...data.suggestions, ...prev]);
        }
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const saveAsTemplate = async (suggestion: LetterTemplate) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/letter-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...suggestion,
          id: undefined // Remove ID to create new template
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(prev => [data.template, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Filter suggestions and templates
  const filterItems = (items: LetterTemplate[]) => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !filterCategory || item.category === filterCategory;
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesUrgency = !filterUrgency || item.urgency === filterUrgency;

      return matchesSearch && matchesCategory && matchesType && matchesUrgency;
    });
  };

  const filteredSuggestions = filterItems(suggestions);
  const filteredTemplates = filterItems(templates);

  const getUrgencyConfig = (urgency: string) => {
    return URGENCY_LEVELS.find(level => level.value === urgency) || URGENCY_LEVELS[0];
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Letter & Email Assistant
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-powered writing assistance for healthcare compliance communications
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900 border-b-2 border-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>AI Suggestions ({suggestions.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900 border-b-2 border-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                <span>My Templates ({templates.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900 border-b-2 border-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Edit3 className="h-4 w-4" />
                <span>Create New</span>
              </div>
            </button>
          </div>

          {/* Search and Filters */}
          {(activeTab === 'suggestions' || activeTab === 'templates') && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search letters and emails..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>

                {(filterCategory || filterType !== 'all' || filterUrgency) && (
                  <button
                    onClick={() => {
                      setFilterCategory('');
                      setFilterType('all');
                      setFilterUrgency('');
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">All Categories</option>
                      {LETTER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Types</option>
                      <option value="email">Email</option>
                      <option value="letter">Formal Letter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Urgency
                    </label>
                    <select
                      value={filterUrgency}
                      onChange={(e) => setFilterUrgency(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">All Priorities</option>
                      {URGENCY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'create' ? (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="flex items-center gap-2 text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                    <Sparkles className="h-5 w-5" />
                    Generate AI-Powered Letter or Email
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Provide context and requirements, and AI will generate professional healthcare compliance communications for you.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Context & Situation
                      </label>
                      <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        rows={4}
                        placeholder="Describe the situation, incident, or reason for the communication..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Communication Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="email"
                            checked={letterType === 'email'}
                            onChange={(e) => setLetterType(e.target.value as any)}
                            className="mr-2"
                          />
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="letter"
                            checked={letterType === 'letter'}
                            onChange={(e) => setLetterType(e.target.value as any)}
                            className="mr-2"
                          />
                          <FileText className="h-4 w-4 mr-1" />
                          Formal Letter
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select category...</option>
                        {LETTER_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recipient Type
                      </label>
                      <select
                        value={selectedRecipient}
                        onChange={(e) => setSelectedRecipient(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select recipient...</option>
                        {RECIPIENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Urgency Level
                      </label>
                      <select
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {URGENCY_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={generateLetterSuggestions}
                    disabled={!context.trim() || !selectedCategory || !selectedRecipient || generating}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Suggestions
                      </>
                    )}
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Generated Suggestions
                    </h4>
                    <div className="grid gap-4">
                      {suggestions.slice(0, 3).map(suggestion => (
                        <div key={suggestion.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {suggestion.title}
                            </h5>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(suggestion.content, suggestion.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                title="Copy to clipboard"
                              >
                                {copied === suggestion.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => saveAsTemplate(suggestion)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                title="Save as template"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {suggestion.description}
                          </p>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans">{suggestion.content}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (activeTab === 'suggestions' ? filteredSuggestions : filteredTemplates).length === 0 ? (
                  <div className="text-center py-12">
                    {activeTab === 'suggestions' ? (
                      <>
                        <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No suggestions yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          {searchTerm || filterCategory || filterType !== 'all' || filterUrgency
                            ? 'Try adjusting your search or filters'
                            : 'Generate AI-powered letter and email suggestions from the Create tab'}
                        </p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Sparkles className="h-4 w-4" />
                          Create Suggestions
                        </button>
                      </>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No templates found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm || filterCategory || filterType !== 'all' || filterUrgency
                            ? 'Try adjusting your search or filters'
                            : 'Save AI suggestions as templates to see them here'}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  (activeTab === 'suggestions' ? filteredSuggestions : filteredTemplates).map(item => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {item.type === 'email' ? (
                            <Mail className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                {item.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {item.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyToClipboard(item.content, item.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                title="Copy to clipboard"
                              >
                                {copied === item.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                              {activeTab === 'suggestions' && (
                                <button
                                  onClick={() => saveAsTemplate(item)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                  title="Save as template"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {item.category}
                            </div>
                            <div className="flex items-center gap-1">
                              {item.type === 'email' ? <Users className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                              {item.recipient_type}
                            </div>
                            <div className="flex items-center gap-1">
                              {getUrgencyIcon(item.urgency)}
                              <span className={getUrgencyConfig(item.urgency).color}>
                                {getUrgencyConfig(item.urgency).label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.tags.slice(0, 4).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 4 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  +{item.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                              {item.content}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}