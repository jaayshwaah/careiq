"use client";

import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface Correction {
  type: 'error' | 'warning' | 'info';
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

interface CorrectionSummary {
  totalCorrections: number;
  errors: number;
  warnings: number;
  info: number;
  corrections: Correction[];
}

export default function PBJCorrectorAI() {
  const [file, setFile] = useState<File | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [correctedContent, setCorrectedContent] = useState<string>('');
  const [correctionSummary, setCorrectionSummary] = useState<CorrectionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showCorrected, setShowCorrected] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.xml')) {
      setError('Please upload an XML file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setCorrectedContent('');
    setCorrectionSummary(null);

    try {
      const content = await selectedFile.text();
      setOriginalContent(content);
      await processPBJFile(content);
    } catch (err) {
      setError('Failed to read file');
      console.error('File read error:', err);
    }
  };

  const processPBJFile = async (content: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pbj-corrector-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to process PBJ file');
      }

      const result = await response.json();
      setCorrectedContent(result.correctedXml);
      setCorrectionSummary(result.summary);
    } catch (err) {
      setError('Failed to process PBJ file');
      console.error('Processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCorrectedFile = () => {
    if (!correctedContent || !file) return;

    const blob = new Blob([correctedContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('.xml', '_corrected.xml');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSummary = () => {
    if (!correctionSummary) return;

    const summaryText = `PBJ Correction Summary
Generated: ${new Date().toLocaleString()}

Total Corrections: ${correctionSummary.totalCorrections}
Errors Fixed: ${correctionSummary.errors}
Warnings: ${correctionSummary.warnings}
Info: ${correctionSummary.info}

DETAILED CORRECTIONS:
${correctionSummary.corrections.map((c, i) => `
${i + 1}. [${c.type.toUpperCase()}] ${c.field}
   Original: ${c.original}
   Corrected: ${c.corrected}
   Reason: ${c.reason}
`).join('\n')}`;

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pbj_correction_summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            PBJ Corrector & Formatter
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            AI-powered tool that corrects and formats PBJ data into ready-to-submit XML files per CMS PBJ 4.00.0 specifications. 
            Get a detailed summary of all corrections made.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-4xl mx-auto">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✨ Updated with Official PBJ 4.00.0 Specifications</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Validates job title codes (1-40) and pay type codes (1-3)</li>
              <li>• Ensures proper XML structure and required elements</li>
              <li>• Corrects date formats, employee IDs, and facility information</li>
              <li>• Validates state codes, fiscal years, and report quarters</li>
              <li>• Handles special characters and XML entity references</li>
              <li>• Removes blank values and ensures data integrity</li>
            </ul>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Upload PBJ XML File
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Upload your PBJ XML file for AI-powered correction and formatting
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="h-5 w-5" />
              {loading ? 'Processing...' : 'Choose XML File'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                AI is analyzing your PBJ file...
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                This may take a few moments depending on file size
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {correctionSummary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Correction Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Correction Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {correctionSummary.errors}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200">Errors Fixed</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {correctionSummary.warnings}
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">Warnings</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {correctionSummary.info}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">Info</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {correctionSummary.totalCorrections}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">Total</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={downloadCorrectedFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Corrected XML
                </button>
                <button
                  onClick={downloadSummary}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Download Summary
                </button>
              </div>
            </div>

            {/* Detailed Corrections */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Detailed Corrections
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {correctionSummary.corrections.map((correction, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      correction.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        : correction.type === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        correction.type === 'error'
                          ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                          : correction.type === 'warning'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                      }`}>
                        {correction.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {correction.field}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="mb-1">
                        <strong>Original:</strong> {correction.original}
                      </div>
                      <div className="mb-1">
                        <strong>Corrected:</strong> {correction.corrected}
                      </div>
                      <div>
                        <strong>Reason:</strong> {correction.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* File Content Comparison */}
        {(originalContent || correctedContent) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                File Content Comparison
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showOriginal
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                  }`}
                >
                  {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Original
                </button>
                <button
                  onClick={() => setShowCorrected(!showCorrected)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showCorrected
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                  }`}
                >
                  {showCorrected ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Corrected
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {showOriginal && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Original File
                  </h4>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    {originalContent}
                  </pre>
                </div>
              )}
              {showCorrected && correctedContent && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Corrected File
                  </h4>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    {correctedContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
