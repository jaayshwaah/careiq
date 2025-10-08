"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Search,
  Trash2,
  BookOpen,
  Shield,
  Globe,
  Database,
  Plus,
  Download,
  Eye,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

/**
 * Admin Knowledge Base Management
 * For uploading global CMS regulations, MDS guidelines, CDC protocols, etc.
 * These documents are available to ALL facilities
 */
export default function AdminKnowledgeBasePage() {
  const router = useRouter();
  const { isAuthenticated, user, userProfile } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [category, setCategory] = useState('CMS Regulation');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [state, setState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    byCategory: {} as Record<string, number>,
    byState: {} as Record<string, number>
  });

  const globalCategories = [
    { value: 'CMS Regulation', icon: Shield, color: 'blue', description: 'Federal CMS requirements, CFR 42 Part 483, F-Tags' },
    { value: 'MDS Guidelines', icon: FileText, color: 'purple', description: 'MDS 3.0 RAI Manual, assessment guidance' },
    { value: 'State Regulation', icon: Globe, color: 'green', description: 'State-specific nursing home regulations' },
    { value: 'CDC Guidelines', icon: Shield, color: 'red', description: 'Infection control, public health guidance' },
    { value: 'Joint Commission', icon: Shield, color: 'purple', description: 'Accreditation standards and requirements' },
    { value: 'CMS Memos', icon: FileText, color: 'yellow', description: 'CMS guidance memos and updates' },
    { value: 'SOM Updates', icon: BookOpen, color: 'indigo', description: 'State Operations Manual updates' },
    { value: 'Best Practices', icon: CheckCircle2, color: 'teal', description: 'Industry best practices and research' }
  ];

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Only administrators can access this page
    if (!userProfile?.is_admin && userProfile?.role !== 'administrator') {
      router.push('/');
      return;
    }
    
    loadDocuments();
    loadStats();
  }, [isAuthenticated, userProfile, router]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load global documents (facility_id is null for global docs)
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, category, state, source_url, metadata, created_at, last_updated')
        .is('facility_id', null) // Global documents only
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by original source
      const grouped = (data || []).reduce((acc: any, doc: any) => {
        const key = doc.source_url || doc.title || doc.id;
        if (!acc[key]) {
          acc[key] = {
            id: doc.id,
            title: doc.title,
            category: doc.category,
            state: doc.state,
            sourceUrl: doc.source_url,
            uploadDate: doc.created_at,
            lastUpdated: doc.last_updated,
            chunks: 0,
            metadata: doc.metadata || {}
          };
        }
        acc[key].chunks++;
        return acc;
      }, {});

      setDocuments(Object.values(grouped));
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('category, state')
        .is('facility_id', null);

      if (error) throw error;

      const byCategory: Record<string, number> = {};
      const byState: Record<string, number> = {};
      
      (data || []).forEach((doc: any) => {
        byCategory[doc.category || 'Other'] = (byCategory[doc.category || 'Other'] || 0) + 1;
        if (doc.state) {
          byState[doc.state] = (byState[doc.state] || 0) + 1;
        }
      });

      setStats({
        totalDocuments: Object.keys(byCategory).length,
        totalChunks: data?.length || 0,
        byCategory,
        byState
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title for the document');
      return;
    }

    setUploading(true);
    setUploadResults([]);

    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_INGEST_KEY || prompt('Enter admin ingest key:');
      
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const payload = {
          title: `${title} - ${file.name}`,
          category,
          source_url: sourceUrl || null,
          state: state || null,
          last_updated: new Date().toISOString()
        };
        
        formData.append('payload', JSON.stringify(payload));

        const response = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'x-admin-token': adminKey || ''
          },
          body: formData
        });

        const result = await response.json();
        
        setUploadResults(prev => [...prev, {
          filename: file.name,
          status: result.ok ? 'success' : 'error',
          error: result.error || null,
          inserted: result.inserted || 0
        }]);
      }

      // Reload documents
      loadDocuments();
      loadStats();
      
      // Reset form
      setSelectedFiles([]);
      setTitle('');
      setSourceUrl('');
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadResults([{ 
        filename: 'Error', 
        status: 'error', 
        error: error.message || 'Upload failed' 
      }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this global document? This will affect all facilities.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const renderUploadTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Global Knowledge Base</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Documents uploaded here are available to <strong>all facilities</strong>. Use this for CMS regulations,
              MDS guidelines, CDC protocols, and other universal healthcare compliance resources.
            </p>
          </div>
        </div>
      </div>

      {/* Document Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., 42 CFR Part 483 - Subpart B"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          >
            {globalCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source URL (Optional)
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://cms.gov/..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            State (Optional)
          </label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g., CA, TX, NY (for state-specific docs)"
            maxLength={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          />
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload Files *
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              PDF, Word, or text files (max 50MB per file)
            </p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || selectedFiles.length === 0 || !title.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading and processing...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            Upload to Global Knowledge Base
          </>
        )}
      </button>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="space-y-2">
          {uploadResults.map((result, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{result.filename}</p>
                  {result.status === 'success' ? (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Successfully uploaded • {result.inserted} chunks created
                    </p>
                  ) : (
                    <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderManageTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
        >
          <option value="all">All Categories</option>
          {globalCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.value}</option>
          ))}
        </select>
        <button
          onClick={loadDocuments}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No documents found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">{doc.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {doc.category}
                    </span>
                    {doc.state && (
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {doc.state}
                      </span>
                    )}
                    <span>{doc.chunks} chunks</span>
                    <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                  </div>
                  {doc.sourceUrl && (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
                    >
                      View source →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="ml-4 text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete document"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDocuments}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Global Documents</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalChunks}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Chunks</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(stats.byState).length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">States Covered</p>
        </div>
      </div>

      {/* By Category */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents by Category</h3>
        <div className="space-y-3">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">{category}</span>
              <span className="text-gray-900 dark:text-white font-medium">{count} chunks</span>
            </div>
          ))}
        </div>
      </div>

      {/* By State */}
      {Object.keys(stats.byState).length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">State-Specific Documents</h3>
          <div className="space-y-3">
            {Object.entries(stats.byState).map(([state, count]) => (
              <div key={state} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{state}</span>
                <span className="text-gray-900 dark:text-white font-medium">{count} chunks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg mb-6">
          <h1 className="text-3xl font-bold mb-3 flex items-center gap-3">
            <Database className="h-8 w-8" />
            Global Knowledge Base Management
          </h1>
          <p className="text-white text-lg leading-relaxed">
            Upload and manage CMS regulations, MDS guidelines, and other universal healthcare compliance documents
            that will be available to all facilities.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-1 px-4" aria-label="Tabs">
              {[
                { id: 'upload', label: 'Upload Documents', icon: Upload },
                { id: 'manage', label: 'Manage Documents', icon: FileText },
                { id: 'stats', label: 'Statistics', icon: BarChart3 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'upload' && renderUploadTab()}
            {activeTab === 'manage' && renderManageTab()}
            {activeTab === 'stats' && renderStatsTab()}
          </div>
        </div>
      </div>
    </div>
  );
}


