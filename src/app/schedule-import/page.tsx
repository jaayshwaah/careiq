"use client";

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileSpreadsheet,
  BarChart3,
  Shield,
  Download,
  Eye,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface ComplianceIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestions: string[];
}

interface ImportResult {
  total_shifts: number;
  parse_errors: number;
  compliance_issues: number;
  critical_issues: number;
  warnings: number;
}

interface ScheduleImport {
  id: string;
  filename: string;
  imported_at: string;
  imported_by: string;
  total_shifts: number;
  compliance_issues: number;
  status: 'success' | 'warning' | 'error';
}

export default function ScheduleImportPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [facilityCapacity, setFacilityCapacity] = useState<number>(0);
  const [importType, setImportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [uploadResults, setUploadResults] = useState<{
    summary: ImportResult;
    compliance_issues: ComplianceIssue[];
    parse_errors: string[];
  } | null>(null);
  
  const [recentImports, setRecentImports] = useState<ScheduleImport[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadRecentImports();
    loadFacilityCapacity();
  }, [isAuthenticated, user]);

  const loadRecentImports = async () => {
    try {
      const { data: imports, error } = await supabase
        .from('schedule_imports')
        .select('*')
        .eq('imported_by', user?.id)
        .order('imported_at', { ascending: false })
        .limit(10);

      if (!error && imports) {
        setRecentImports(imports);
      }
    } catch (error) {
      console.error('Failed to load recent imports:', error);
    }
  };

  const loadFacilityCapacity = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('user_id', user?.id)
        .single();

      if (profile?.metadata?.facility_capacity) {
        setFacilityCapacity(profile.metadata.facility_capacity);
      }
    } catch (error) {
      console.error('Failed to load facility capacity:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResults(null);
      setShowResults(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !user?.id) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('schedule_file', selectedFile);
      formData.append('import_type', importType);
      formData.append('facility_capacity', facilityCapacity.toString());

      const response = await fetch('/api/schedule-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResults({
          summary: result.summary,
          compliance_issues: result.compliance_issues || [],
          parse_errors: result.parse_errors || []
        });
        setShowResults(true);
        setSelectedFile(null);
        loadRecentImports();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadTab = () => (
    <div className="space-y-6">
      {/* Upload Configuration */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Schedule Import Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily Schedule</option>
              <option value="weekly">Weekly Schedule</option>
              <option value="monthly">Monthly Schedule</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facility Capacity (beds)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={facilityCapacity || ''}
              onChange={(e) => setFacilityCapacity(parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 120"
            />
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Required for compliance checking</p>
              <p>Used to calculate PPD ratios and staffing adequacy</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Required CSV Format
        </h3>
        
        <div className="text-sm text-blue-700 mb-4">
          <p className="mb-2">Your CSV file must include these columns in order:</p>
          <code className="block bg-blue-100 p-3 rounded font-mono text-xs">
            Employee Name,Role,Date,Start Time,End Time,Hours,Employee ID,Unit<br/>
            John Doe,RN,2024-01-15,07:00,19:00,12,EMP001,ICU<br/>
            Jane Smith,LPN,2024-01-15,19:00,07:00,12,EMP002,Medical<br/>
            Bob Johnson,CNA,2024-01-15,07:00,15:00,8,EMP003,Dementia
          </code>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Valid Roles:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• RN (Registered Nurse)</li>
              <li>• LPN (Licensed Practical Nurse)</li>
              <li>• CNA (Certified Nursing Assistant)</li>
              <li>• Unit Manager</li>
              <li>• Other</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Time Format:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• 24-hour format: 07:00, 19:30</li>
              <li>• Date format: YYYY-MM-DD</li>
              <li>• Hours should match calculated time difference</li>
            </ul>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Upload Schedule File</h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleImport}
                disabled={loading || facilityCapacity === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing Schedule...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Import & Check Compliance
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium mb-2">Drop CSV file here or click to browse</p>
              <p className="text-gray-600 mb-4">Supports CSV files up to 10MB</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Choose File
              </label>
            </div>
          )}
        </div>
        
        {facilityCapacity === 0 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-700 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Please set your facility capacity above before importing schedules.
          </div>
        )}
      </div>
    </div>
  );

  const renderResultsPanel = () => {
    if (!uploadResults) return null;

    const { summary, compliance_issues, parse_errors } = uploadResults;

    return (
      <div className="mt-6 space-y-6">
        {/* Import Summary */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Import Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.total_shifts}</div>
              <div className="text-sm text-blue-800">Shifts Imported</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.critical_issues}</div>
              <div className="text-sm text-red-800">Critical Issues</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{summary.warnings}</div>
              <div className="text-sm text-orange-800">Warnings</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summary.parse_errors}</div>
              <div className="text-sm text-yellow-800">Parse Errors</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {summary.total_shifts - summary.compliance_issues}
              </div>
              <div className="text-sm text-green-800">Clean Shifts</div>
            </div>
          </div>
        </div>

        {/* Compliance Issues */}
        {compliance_issues.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Compliance Issues ({compliance_issues.length})
            </h3>
            
            <div className="space-y-4">
              {compliance_issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    issue.severity === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : issue.severity === 'warning'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : issue.severity === 'warning'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 uppercase">
                          {issue.type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {issue.message}
                      </p>
                      
                      {issue.suggestions && issue.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Suggestions:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {issue.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span>•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parse Errors */}
        {parse_errors.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800">
              Parse Errors ({parse_errors.length})
            </h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="space-y-2 text-sm text-yellow-800">
                {parse_errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Imports</h3>
            <button
              onClick={loadRecentImports}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentImports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No schedule imports yet.</p>
              <p className="text-sm">Upload your first schedule to see import history.</p>
            </div>
          ) : (
            recentImports.map((importRecord) => (
              <div key={importRecord.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900">{importRecord.filename}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        importRecord.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : importRecord.status === 'warning'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {importRecord.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {importRecord.total_shifts} shifts
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {importRecord.compliance_issues} issues
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(importRecord.imported_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/90 to-purple-700/90 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Schedule Import & Compliance
        </h1>
        <p className="text-purple-100">
          Import staff schedules and automatically check for CMS compliance violations, staffing gaps, and overtime issues.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Schedule
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Import History ({recentImports.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? renderUploadTab() : renderHistoryTab()}
      
      {/* Results Panel */}
      {showResults && renderResultsPanel()}
    </div>
  );
}