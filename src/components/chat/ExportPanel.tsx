// src/components/chat/ExportPanel.tsx
"use client";

import { useState } from 'react';
import { Download, X, FileText, Table, Settings, Calendar } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
}

export default function ExportPanel({ isOpen, onClose, chatId, chatTitle }: ExportPanelProps) {
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [excelFormat, setExcelFormat] = useState<'detailed' | 'simple' | 'analytics'>('detailed');
  const supabase = getBrowserSupabase();

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (exportType === 'pdf') {
        await exportToPDF();
      } else {
        await exportToExcel();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const exportToPDF = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get messages for the chat
    const messagesResponse = await fetch(`/api/messages/${chatId}`, {
      headers: {
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to fetch messages');
    }

    const messagesData = await messagesResponse.json();
    
    // Call PDF export API
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify({
        title: chatTitle || 'Chat Export',
        messages: messagesData.messages?.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.created_at,
        })) || [],
      }),
    });

    if (!response.ok) {
      throw new Error('PDF export failed');
    }

    // Download the PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careiq-chat-${chatTitle?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportToExcel = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/export/excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify({
        chat_id: chatId,
        include_metadata: includeMetadata,
        format: excelFormat,
      }),
    });

    if (!response.ok) {
      throw new Error('Excel export failed');
    }

    // Download the Excel file (CSV format)
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careiq-chat-${chatTitle?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Chat</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {chatTitle || 'Untitled Chat'}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType('pdf')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  exportType === 'pdf'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium text-sm">PDF</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Formatted document
                </div>
              </button>
              
              <button
                onClick={() => setExportType('excel')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  exportType === 'excel'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Table className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium text-sm">Excel</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Spreadsheet with data
                </div>
              </button>
            </div>
          </div>

          {/* Excel Format Options */}
          {exportType === 'excel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Excel Format
              </label>
              <select
                value={excelFormat}
                onChange={(e) => setExcelFormat(e.target.value as 'detailed' | 'simple' | 'analytics')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="detailed">Detailed - Full conversation with metadata</option>
                <option value="simple">Simple - Messages only</option>
                <option value="analytics">Analytics - Statistics and metrics</option>
              </select>
            </div>
          )}

          {/* Options */}
          {exportType === 'excel' && (
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-white">Include metadata and analytics</span>
              </label>
            </div>
          )}

          {/* Export Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div className="font-medium mb-1">Export includes:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>All messages in this conversation</li>
                  <li>Timestamps and message roles</li>
                  {exportType === 'excel' && excelFormat === 'analytics' && (
                    <li>Usage statistics and analytics</li>
                  )}
                  {exportType === 'pdf' && (
                    <li>Formatted document with CareIQ branding</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3 inline mr-1" />
              Generated {new Date().toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg 
                         font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export {exportType.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}