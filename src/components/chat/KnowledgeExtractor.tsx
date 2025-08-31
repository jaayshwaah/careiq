// src/components/chat/KnowledgeExtractor.tsx - AI-powered knowledge extraction from chat messages
"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { Brain, Tag, FileText, Save, Loader2, Lightbulb, BookOpen, AlertCircle } from "lucide-react";

interface KnowledgeItem {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence_score: number;
  source_type: 'chat' | 'document' | 'manual';
  metadata: {
    chat_id?: string;
    message_id?: string;
    extracted_at: string;
    key_concepts: string[];
    compliance_areas: string[];
  };
}

interface KnowledgeExtractorProps {
  messageId: string;
  messageContent: string;
  chatId: string;
  onClose: () => void;
  onSaved: (item: KnowledgeItem) => void;
}

const COMPLIANCE_CATEGORIES = [
  'Survey Preparation',
  'F-Tags & Deficiencies', 
  'Staff Training',
  'Policy & Procedures',
  'Incident Management',
  'Quality Assurance',
  'Documentation',
  'Regulatory Updates',
  'Best Practices',
  'General Knowledge'
];

const SUGGESTED_TAGS = [
  'regulatory', 'cms', 'f-tag', 'survey', 'deficiency', 'training', 
  'policy', 'procedure', 'incident', 'falls', 'medication', 'infection-control',
  'documentation', 'care-plan', 'admission', 'discharge', 'quality-measure',
  'staffing', 'competency', 'emergency', 'safety', 'compliance'
];

export default function KnowledgeExtractor({
  messageId,
  messageContent,
  chatId,
  onClose,
  onSaved
}: KnowledgeExtractorProps) {
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedKnowledge, setExtractedKnowledge] = useState<KnowledgeItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = getBrowserSupabase();

  const extractKnowledge = async () => {
    try {
      setExtracting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/knowledge-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: messageContent,
          source_type: 'chat',
          metadata: {
            chat_id: chatId,
            message_id: messageId,
            extracted_at: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract knowledge');
      }

      const data = await response.json();
      setExtractedKnowledge(data.knowledge_item);

    } catch (err) {
      console.error('Knowledge extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract knowledge');
    } finally {
      setExtracting(false);
    }
  };

  const saveKnowledge = async () => {
    if (!extractedKnowledge) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...extractedKnowledge,
          user_id: session.user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save knowledge');
      }

      const data = await response.json();
      onSaved(data.knowledge_item);
      onClose();

    } catch (err) {
      console.error('Save failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save knowledge');
    } finally {
      setSaving(false);
    }
  };

  const updateExtractedKnowledge = (field: keyof KnowledgeItem, value: any) => {
    if (!extractedKnowledge) return;
    setExtractedKnowledge({
      ...extractedKnowledge,
      [field]: value
    });
  };

  const addTag = (tag: string) => {
    if (!extractedKnowledge || extractedKnowledge.tags.includes(tag)) return;
    updateExtractedKnowledge('tags', [...extractedKnowledge.tags, tag]);
  };

  const removeTag = (tag: string) => {
    if (!extractedKnowledge) return;
    updateExtractedKnowledge('tags', extractedKnowledge.tags.filter(t => t !== tag));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Knowledge Extraction</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Extract key knowledge from this message
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {!extractedKnowledge ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Extract Knowledge
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Use AI to automatically extract key knowledge, concepts, and insights from this message
                for your knowledge base.
              </p>
              <button
                onClick={extractKnowledge}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Extract Knowledge
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Confidence Score */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score:</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all"
                      style={{ width: `${extractedKnowledge.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(extractedKnowledge.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={extractedKnowledge.title}
                  onChange={(e) => updateExtractedKnowledge('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Knowledge item title"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={extractedKnowledge.category}
                  onChange={(e) => updateExtractedKnowledge('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COMPLIANCE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={extractedKnowledge.content}
                  onChange={(e) => updateExtractedKnowledge('content', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="Knowledge content..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {extractedKnowledge.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Suggested tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_TAGS
                      .filter(tag => !extractedKnowledge.tags.includes(tag))
                      .slice(0, 8)
                      .map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Key Concepts */}
              {extractedKnowledge.metadata.key_concepts?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Key Concepts
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {extractedKnowledge.metadata.key_concepts.map(concept => (
                      <span 
                        key={concept}
                        className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-sm"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Areas */}
              {extractedKnowledge.metadata.compliance_areas?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Compliance Areas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {extractedKnowledge.metadata.compliance_areas.map(area => (
                      <span 
                        key={area}
                        className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-sm"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {extractedKnowledge && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This knowledge will be added to your knowledge base
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveKnowledge}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Knowledge
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}