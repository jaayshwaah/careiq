"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  ChevronRight,
  Building,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface ComplianceItem {
  id: string;
  ftag: string;
  title: string;
  category: string;
  status: 'compliant' | 'at-risk' | 'non-compliant' | 'pending';
  lastReviewed: string;
  nextReview: string;
  score: number;
  findings?: string[];
}

export default function CompliancePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, userProfile } = useAuth();
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with API call
      const mockData: ComplianceItem[] = [
        {
          id: '1',
          ftag: 'F880',
          title: 'Infection Prevention and Control',
          category: 'Quality of Care',
          status: 'compliant',
          lastReviewed: '2024-01-15',
          nextReview: '2024-02-15',
          score: 95,
          findings: []
        },
        {
          id: '2',
          ftag: 'F675',
          title: 'Quality of Care',
          category: 'Quality of Care',
          status: 'at-risk',
          lastReviewed: '2024-01-10',
          nextReview: '2024-02-10',
          score: 78,
          findings: ['Documentation gaps in care plans', 'Missing signatures on assessments']
        },
        {
          id: '3',
          ftag: 'F684',
          title: 'Sufficient Staff',
          category: 'Staffing',
          status: 'compliant',
          lastReviewed: '2024-01-20',
          nextReview: '2024-02-20',
          score: 92
        },
        {
          id: '4',
          ftag: 'F550',
          title: 'Resident Rights',
          category: 'Resident Rights',
          status: 'non-compliant',
          lastReviewed: '2024-01-08',
          nextReview: '2024-02-08',
          score: 65,
          findings: ['Privacy violations reported', 'Informed consent documentation incomplete']
        },
        {
          id: '5',
          ftag: 'F580',
          title: 'Dietary Services',
          category: 'Dietary',
          status: 'pending',
          lastReviewed: '2023-12-15',
          nextReview: '2024-01-15',
          score: 0
        }
      ];
      setComplianceItems(mockData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200';
      case 'at-risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'non-compliant': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="w-5 h-5" />;
      case 'at-risk': return <AlertCircle className="w-5 h-5" />;
      case 'non-compliant': return <AlertTriangle className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const filteredItems = complianceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.ftag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    compliant: complianceItems.filter(i => i.status === 'compliant').length,
    atRisk: complianceItems.filter(i => i.status === 'at-risk').length,
    nonCompliant: complianceItems.filter(i => i.status === 'non-compliant').length,
    pending: complianceItems.filter(i => i.status === 'pending').length,
    avgScore: Math.round(complianceItems.reduce((acc, i) => acc + i.score, 0) / complianceItems.length)
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Compliance Monitoring
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  CMS F-Tag compliance tracking for {userProfile?.facility_name || 'your facility'}
                </p>
              </div>
            </div>
            <button
              onClick={loadComplianceData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliant</p>
                <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold text-blue-600">{stats.avgScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search F-Tags or titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="at-risk">At Risk</option>
              <option value="non-compliant">Non-Compliant</option>
              <option value="pending">Pending</option>
            </select>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Quality of Care">Quality of Care</option>
              <option value="Staffing">Staffing</option>
              <option value="Resident Rights">Resident Rights</option>
              <option value="Dietary">Dietary</option>
            </select>
          </div>
        </div>

        {/* Compliance Items */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/cms-guidance?ftag=${item.ftag}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                      {item.ftag}
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {item.score > 0 && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Score: <span className="font-semibold">{item.score}%</span>
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Category: {item.category}
                  </p>
                  
                  {item.findings && item.findings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                        Findings:
                      </p>
                      <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                        {item.findings.map((finding, idx) => (
                          <li key={idx}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Last: {new Date(item.lastReviewed).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Next: {new Date(item.nextReview).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No compliance items found</p>
          </div>
        )}
      </div>
    </div>
  );
}
