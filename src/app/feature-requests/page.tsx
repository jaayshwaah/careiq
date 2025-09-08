"use client";

import { useState, useEffect } from 'react';
import { 
  Plus, 
  ThumbsUp, 
  MessageSquare, 
  Filter, 
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Users,
  Calendar,
  Tag
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  votes: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  has_voted?: boolean;
  author_name?: string;
}

const categories = [
  { value: 'all', label: 'All Categories', icon: Tag },
  { value: 'ui', label: 'User Interface', icon: Star },
  { value: 'functionality', label: 'Functionality', icon: TrendingUp },
  { value: 'integration', label: 'Integrations', icon: MessageSquare },
  { value: 'performance', label: 'Performance', icon: Clock },
  { value: 'security', label: 'Security', icon: AlertCircle },
  { value: 'general', label: 'General', icon: Plus }
];

const statuses = [
  { value: 'all', label: 'All Status', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'under_review', label: 'Under Review', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

export default function FeatureRequestsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const supabase = getBrowserSupabase();
  
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('votes');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [isAuthenticated, user]);

  const loadRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/feature-requests', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setRequests(result.feature_requests || []);
      } else {
        console.error('Failed to load feature requests');
      }
    } catch (error) {
      console.error('Error loading feature requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestId: string, hasVoted: boolean) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/feature-requests/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (response.ok) {
        // Reload requests to update vote counts
        await loadRequests();
      } else {
        const error = await response.json();
        console.error('Failed to vote:', error);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRequest.title || !newRequest.description) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: newRequest.title,
          description: newRequest.description,
          category: newRequest.category,
          priority: newRequest.priority
        }),
      });

      if (response.ok) {
        setNewRequest({ title: '', description: '', category: 'general', priority: 'medium' });
        setShowNewRequest(false);
        await loadRequests();
      } else {
        const error = await response.json();
        console.error('Failed to submit request:', error);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || req.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || req.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return b.votes - a.votes;
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return b.votes - a.votes;
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Feature Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Suggest new features and vote on what you'd like to see next
          </p>
        </div>
        <button
          onClick={() => setShowNewRequest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Submit Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{requests.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {requests.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {requests.filter(r => r.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Votes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {requests.reduce((sum, r) => sum + r.votes, 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search feature requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="votes">Most Voted</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Submit Feature Request</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Brief description of the feature"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={4}
                  placeholder="Detailed description of the feature and how it would help"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newRequest.category}
                    onChange={(e) => setNewRequest({...newRequest, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {categories.slice(1).map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewRequest(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No feature requests found</h3>
            <p className="text-gray-600 dark:text-gray-400">Be the first to suggest a new feature!</p>
          </div>
        ) : (
          sortedRequests.map((request) => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {request.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>By {request.author_name}</span>
                    <span>•</span>
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{request.category}</span>
                    <span>•</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'under_review' ? 'bg-purple-100 text-purple-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statuses.find(s => s.value === request.status)?.label}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => handleVote(request.id, request.has_voted || false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      request.has_voted
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-medium">{request.votes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
