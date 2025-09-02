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
  Filter,
  Download,
  Trash2,
  Eye,
  Plus,
  BookOpen,
  Shield,
  Building2,
  Globe,
  Clock,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

const KnowledgeManagement = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [documentType, setDocumentType] = useState('Facility Policy');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    categories: {},
    recentUploads: 0
  });

  const documentTypes = [
    { value: 'CMS Regulation', icon: Shield, color: 'blue', description: 'Federal CMS requirements and CFR citations' },
    { value: 'State Regulation', icon: Building2, color: 'green', description: 'State-specific nursing home regulations' },
    { value: 'CDC Guidelines', icon: Shield, color: 'red', description: 'Infection control and public health guidance' },
    { value: 'Joint Commission', icon: Shield, color: 'purple', description: 'Accreditation standards and requirements' },
    { value: 'Facility Policy', icon: FileText, color: 'gray', description: 'Internal policies and procedures' },
    { value: 'SOP', icon: BookOpen, color: 'yellow', description: 'Standard operating procedures' },
    { value: 'Training Material', icon: BookOpen, color: 'indigo', description: 'Staff training and educational content' },
    { value: 'Survey Findings', icon: AlertCircle, color: 'orange', description: 'Regulatory survey results and citations' }
  ];

  // Load user profile and check admin access
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user?.id) {
        router.push('/login');
        return;
      }
      
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (!profileData?.role?.includes('administrator')) {
          router.push('/dashboard');
          return;
        }
        
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to load profile:", error);
        router.push('/dashboard');
      }
    };
    
    loadProfile();
  }, [isAuthenticated, user, router, supabase]);

  useEffect(() => {
    if (profile?.role?.includes('administrator')) {
      loadDocuments();
      loadStats();
    }
  }, [profile]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/upload-facility-docs');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/knowledge/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Fallback to empty state
        setStats({
          totalDocuments: 0,
          totalChunks: 0,
          categories: {},
          recentUploads: 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        totalDocuments: 0,
        totalChunks: 0,
        categories: {},
        recentUploads: 0
      });
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadResults([]);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('documentType', documentType);
    formData.append('description', description);

    try {
      const response = await fetch('/api/upload-facility-docs', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      setUploadResults(result.results || []);
      
      if (result.ok) {
        setSelectedFiles([]);
        setDescription('');
        loadDocuments();
        loadStats();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResults([{ 
        filename: 'Error', 
        status: 'error', 
        error: 'Upload failed. Please try again.' 
      }]);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/knowledge/${documentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadDocuments();
        loadStats();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || doc.documentType === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const renderUploadTab = () => (
    <div className="space-y-6">
      {/* Document Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Select Document Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentTypes.map(type => {
            const Icon = type.icon;
            const isSelected = documentType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setDocumentType(type.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected 
                    ? `border-${type.color}-500 bg-${type.color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 ${isSelected ? `text-${type.color}-600` : 'text-gray-500'}`} />
                  <div>
                    <h3 className="font-medium">{type.value}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the documents..."
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Upload Documents</p>
            <p className="text-gray-600">
              Supports PDF, DOCX, and text files. Multiple files allowed.
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Choose Files
            </label>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium mb-2">Selected Files ({selectedFiles.length}):</h3>
            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="flex-1">{file.name}</span>
                  <span className="text-sm text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                  <button
                    onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Documents...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload to Knowledge Base
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setSelectedFiles([]);
              setDescription('');
              setUploadResults([]);
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploading}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold mb-4">Upload Results</h3>
          <div className="space-y-3">
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  result.status === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <p className="font-medium">{result.filename}</p>
                  {result.status === 'success' ? (
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Successfully processed: {result.chunks} chunks, {result.characters} characters</p>
                      <div className="flex gap-4 text-xs">
                        <span>Category: {documentType}</span>
                        {description && <span>Description: {description}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-700">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLibraryTab = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Total Documents</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalDocuments}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <span className="font-medium">Knowledge Chunks</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalChunks}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="font-medium">Recent Uploads</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats.recentUploads}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="font-medium">Categories</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1">{Object.keys(stats.categories).length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.value}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Upload your first document to get started.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc, index) => {
              const docType = documentTypes.find(t => t.value === doc.documentType);
              const Icon = docType?.icon || FileText;
              
              return (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`h-5 w-5 text-${docType?.color || 'gray'}-600 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.filename}</h3>
                        <p className="text-sm text-gray-600 mt-1">{doc.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className={`px-2 py-1 bg-${docType?.color || 'gray'}-100 text-${docType?.color || 'gray'}-700 rounded`}>
                            {doc.documentType}
                          </span>
                          <span>{doc.chunks} chunks</span>
                          <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Show nothing while checking auth or if not admin
  if (!isAuthenticated || !profile?.role?.includes('administrator')) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white rounded-lg p-6 glass">
        <h1 className="text-2xl font-bold mb-2">Knowledge Base Management</h1>
        <p className="text-blue-100">
          Upload, organize, and manage your facility's regulatory and policy documents for AI-powered assistance.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('library')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'library'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Document Library ({stats.totalDocuments})
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? renderUploadTab() : renderLibraryTab()}
    </div>
  );
};

export default KnowledgeManagement;
