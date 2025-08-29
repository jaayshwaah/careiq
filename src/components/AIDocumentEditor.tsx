"use client";

import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  FileText, 
  History, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  User,
  Save,
  Eye,
  ArrowLeft,
  Sparkles,
  Shield,
  Download,
  GitBranch
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface DocumentVersion {
  id: string;
  version_number: number;
  content: string;
  changes_made: string;
  created_at: string;
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  ai_suggestions: string[];
  edited_by: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

interface AIDocumentEditorProps {
  documentId: string;
  originalContent: string;
  documentTitle: string;
  documentType?: string;
  onClose: () => void;
  onSave?: (editedContent: string, versionId: string) => void;
}

export default function AIDocumentEditor({
  documentId,
  originalContent,
  documentTitle,
  documentType = 'Facility Policy',
  onClose,
  onSave
}: AIDocumentEditorProps) {
  const supabase = getBrowserSupabase();
  
  const [editInstruction, setEditInstruction] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [activeView, setActiveView] = useState<'edit' | 'preview' | 'versions'>('edit');
  const [saveAsDraft, setSaveAsDraft] = useState(true);
  const [complianceNotes, setComplianceNotes] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [requiresReview, setRequiresReview] = useState(false);
  const [changesSummary, setChangesSummary] = useState('');

  // Load document versions on mount
  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/ai-edit-document?document_id=${documentId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleAIEdit = async () => {
    if (!editInstruction.trim()) return;

    setIsEditing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ai-edit-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          document_id: documentId,
          original_content: originalContent,
          edit_instruction: editInstruction,
          document_type: documentType,
          save_as_draft: saveAsDraft
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setEditedContent(result.edited_content);
        setChangesSummary(result.changes_summary);
        setComplianceNotes(result.compliance_notes || []);
        setAiSuggestions(result.suggestions || []);
        setRequiresReview(result.requires_review || false);
        setActiveView('preview');
        
        // Reload versions to show the new one
        await loadVersions();
      } else {
        const error = await response.json();
        alert(`Failed to edit document: ${error.error}`);
      }
    } catch (error) {
      console.error('AI edit failed:', error);
      alert('Failed to edit document. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveEdits = () => {
    if (onSave && editedContent) {
      onSave(editedContent, 'new_version_id');
    }
    onClose();
  };

  const renderEditView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          AI Editing Instructions
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What changes would you like me to make to this {documentType.toLowerCase()}?
            </label>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Example: Update the infection control procedures to include the latest CDC guidelines for COVID-19 prevention"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={saveAsDraft}
                onChange={(e) => setSaveAsDraft(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Save as draft (requires approval)</span>
            </label>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleAIEdit}
              disabled={!editInstruction.trim() || isEditing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  AI is editing...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Edit with AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Original Document Preview */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Original Document</h3>
        <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded border">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
            {originalContent}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderPreviewView = () => (
    <div className="space-y-6">
      {/* AI Results Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">AI Editing Complete</h3>
          </div>
          {requiresReview && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              <AlertTriangle className="h-4 w-4" />
              Review Required
            </div>
          )}
        </div>
        
        <p className="text-green-700 mb-4">{changesSummary}</p>
        
        {complianceNotes.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance Notes:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
              {complianceNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Additional AI Suggestions:</h4>
          <ul className="space-y-2 text-sm text-blue-700">
            {aiSuggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edited Content */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edited Document</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdits}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded border">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
            {editedContent}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderVersionsView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version History
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {versions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No versions available yet.</p>
              <p className="text-sm">Create your first edit to see version history.</p>
            </div>
          ) : (
            versions.map((version) => (
              <div key={version.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        v{version.version_number}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        version.approval_status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : version.approval_status === 'pending_review'
                          ? 'bg-orange-100 text-orange-800'
                          : version.approval_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {version.approval_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-2">{version.changes_made}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {version.profiles?.full_name} ({version.profiles?.role})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {version.ai_suggestions && version.ai_suggestions.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                        <p className="text-blue-700 font-medium mb-1">AI Suggestions:</p>
                        <ul className="space-y-1 text-blue-600">
                          {version.ai_suggestions.slice(0, 2).map((suggestion, idx) => (
                            <li key={idx}>• {suggestion}</li>
                          ))}
                          {version.ai_suggestions.length > 2 && (
                            <li>... and {version.ai_suggestions.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedVersion(version)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="View version"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                      title="Download version"
                    >
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Document Editor</h2>
            <p className="text-sm text-gray-600">{documentTitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setActiveView('edit')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  activeView === 'edit' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveView('preview')}
                disabled={!editedContent}
                className={`px-4 py-2 text-sm font-medium ${
                  activeView === 'preview' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                }`}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveView('versions')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  activeView === 'versions' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === 'edit' && renderEditView()}
          {activeView === 'preview' && renderPreviewView()}
          {activeView === 'versions' && renderVersionsView()}
        </div>
      </div>
    </div>
  );
}