"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, Download, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface IncidentReport {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'error';
  summary?: {
    incidentType: string;
    severity: string;
    location: string;
    dateTime: string;
    residentsInvolved: number;
    staffInvolved: string[];
    keyFindings: string[];
    rootCauses: string[];
    correctiveActions: string[];
    preventionStrategies: string[];
    regulatoryImpact: string;
    followUpRequired: boolean;
  };
  error?: string;
}

export default function IncidentReportsPage() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of files) {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add report with processing status
      const newReport: IncidentReport = {
        id: reportId,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      };

      setReports(prev => [newReport, ...prev]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('reportId', reportId);

        const response = await fetch('/api/incident-reports', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setReports(prev => prev.map(report => 
            report.id === reportId 
              ? { ...report, status: 'completed', summary: result.summary }
              : report
          ));
        } else {
          setReports(prev => prev.map(report => 
            report.id === reportId 
              ? { ...report, status: 'error', error: result.error }
              : report
          ));
        }
      } catch (error) {
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, status: 'error', error: 'Failed to process incident report' }
            : report
        ));
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'major': return 'text-orange-700 bg-orange-100';
      case 'moderate': return 'text-yellow-700 bg-yellow-100';
      case 'minor': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const downloadSummary = (report: IncidentReport) => {
    if (!report.summary) return;

    const content = `INCIDENT REPORT SUMMARY
Generated: ${new Date().toLocaleString()}
File: ${report.fileName}

INCIDENT DETAILS
Type: ${report.summary.incidentType}
Severity: ${report.summary.severity}
Location: ${report.summary.location}
Date/Time: ${report.summary.dateTime}
Residents Involved: ${report.summary.residentsInvolved}
Staff Involved: ${report.summary.staffInvolved.join(', ')}

KEY FINDINGS
${report.summary.keyFindings.map(finding => `• ${finding}`).join('\n')}

ROOT CAUSES
${report.summary.rootCauses.map(cause => `• ${cause}`).join('\n')}

CORRECTIVE ACTIONS
${report.summary.correctiveActions.map(action => `• ${action}`).join('\n')}

PREVENTION STRATEGIES
${report.summary.preventionStrategies.map(strategy => `• ${strategy}`).join('\n')}

REGULATORY IMPACT
${report.summary.regulatoryImpact}

FOLLOW-UP REQUIRED: ${report.summary.followUpRequired ? 'Yes' : 'No'}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-summary-${report.fileName.replace(/\.[^/.]+$/, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Incident Report Analyzer</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload incident reports to get AI-powered analysis, root cause identification, and corrective action recommendations.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Incident Reports
        </h2>
        
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">Upload incident reports</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            PDF, DOC, DOCX, or TXT files. Click to browse or drag and drop.
          </p>
          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No incident reports yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Upload your first incident report to get started with AI-powered analysis.
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-6 w-6 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{report.fileName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Uploaded {new Date(report.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {report.status === 'processing' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing</span>
                    </div>
                  )}
                  {report.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Completed</span>
                      <button
                        onClick={() => downloadSummary(report)}
                        className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Download Summary"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {report.status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  )}
                </div>
              </div>

              {report.status === 'error' && report.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-400">{report.error}</p>
                </div>
              )}

              {report.summary && (
                <div className="space-y-4">
                  {/* Key Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Incident Type</label>
                      <p className="text-sm text-gray-900 dark:text-white">{report.summary.incidentType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</label>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.summary.severity)}`}>
                        {report.summary.severity}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                      <p className="text-sm text-gray-900 dark:text-white">{report.summary.location}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date/Time</label>
                      <p className="text-sm text-gray-900 dark:text-white">{report.summary.dateTime}</p>
                    </div>
                  </div>

                  {/* Key Findings */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Key Findings</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.summary.keyFindings.map((finding, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">{finding}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Root Causes */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Root Causes</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.summary.rootCauses.map((cause, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">{cause}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Corrective Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommended Corrective Actions</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {report.summary.correctiveActions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">{action}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Regulatory Impact */}
                  {report.summary.regulatoryImpact && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Regulatory Impact</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">{report.summary.regulatoryImpact}</p>
                    </div>
                  )}

                  {/* Follow-up Required */}
                  {report.summary.followUpRequired && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">Follow-up action required</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}