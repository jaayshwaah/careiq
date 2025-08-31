"use client";

import { useState, useCallback } from 'react';
import { Upload, Download, CheckCircle, AlertTriangle, FileText, Calculator, Clock, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface PBJRecord {
  date: string;
  position: string;
  hours: number;
  salary: boolean;
  employee_id: string;
  errors: string[];
  warnings: string[];
  corrected?: boolean;
}

interface PBJValidationResult {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  errors: Array<{ row: number; field: string; message: string; severity: 'error' | 'warning' }>;
  correctedData?: PBJRecord[];
}

const POSITION_CODES = {
  '11000': 'Administrator',
  '11100': 'Assistant Administrator', 
  '12000': 'RN Director of Nursing',
  '12100': 'RN Assistant Director of Nursing',
  '13000': 'RN Staff',
  '14000': 'LPN/LVN Staff',
  '21000': 'CNA Staff',
  '22000': 'Medication Aide/Technician',
  '31000': 'Physical Therapist',
  '31100': 'Physical Therapy Assistant',
  '32000': 'Occupational Therapist',
  '32100': 'Occupational Therapy Assistant',
  '33000': 'Speech Language Pathologist',
  '34000': 'Respiratory Therapist',
  '41000': 'Social Worker',
  '51000': 'Activities Staff',
  '61000': 'Dietary Staff',
  '71000': 'Housekeeping/Laundry Staff',
  '81000': 'Maintenance Staff'
};

const COMMON_ERRORS = {
  INVALID_DATE: 'Invalid date format. Must be YYYY-MM-DD',
  INVALID_POSITION: 'Invalid position code. Must be valid CMS position code',
  INVALID_HOURS: 'Invalid hours. Must be between 0 and 24',
  MISSING_EMPLOYEE_ID: 'Employee ID is required',
  DUPLICATE_ENTRY: 'Duplicate entry found for same employee, position, and date',
  WEEKEND_RN: 'RN coverage required on weekends - verify staffing',
  EXCESSIVE_HOURS: 'Hours exceed 16 per day - verify accuracy',
  NO_DON_COVERAGE: 'No Director of Nursing coverage found for this period'
};

export default function PBJCorrector() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<PBJValidationResult | null>(null);
  const [rawData, setRawData] = useState<PBJRecord[]>([]);
  const [correctedData, setCorrectedData] = useState<PBJRecord[]>([]);
  const [showCorrections, setShowCorrections] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && (uploadedFile.type === 'text/csv' || uploadedFile.name.endsWith('.csv'))) {
      setFile(uploadedFile);
      setValidationResult(null);
      setRawData([]);
      setCorrectedData([]);
    } else {
      alert('Please upload a CSV file');
    }
  }, []);

  const parsePBJFile = async (csvText: string): Promise<PBJRecord[]> => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const records: PBJRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: PBJRecord = {
        date: values[headers.indexOf('date')] || '',
        position: values[headers.indexOf('position')] || values[headers.indexOf('position_code')] || '',
        hours: parseFloat(values[headers.indexOf('hours')] || '0'),
        salary: values[headers.indexOf('salary')]?.toLowerCase() === 'true' || values[headers.indexOf('salary')] === '1',
        employee_id: values[headers.indexOf('employee_id')] || values[headers.indexOf('emp_id')] || '',
        errors: [],
        warnings: []
      };
      records.push(record);
    }

    return records;
  };

  const validatePBJRecord = (record: PBJRecord, index: number, allRecords: PBJRecord[]): void => {
    // Date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date)) {
      record.errors.push(COMMON_ERRORS.INVALID_DATE);
    }

    // Position code validation
    if (!POSITION_CODES[record.position as keyof typeof POSITION_CODES]) {
      record.errors.push(COMMON_ERRORS.INVALID_POSITION);
    }

    // Hours validation
    if (isNaN(record.hours) || record.hours < 0 || record.hours > 24) {
      record.errors.push(COMMON_ERRORS.INVALID_HOURS);
    }

    if (record.hours > 16) {
      record.warnings.push(COMMON_ERRORS.EXCESSIVE_HOURS);
    }

    // Employee ID validation
    if (!record.employee_id || record.employee_id.trim() === '') {
      record.errors.push(COMMON_ERRORS.MISSING_EMPLOYEE_ID);
    }

    // Duplicate check
    const duplicates = allRecords.filter((r, idx) => 
      idx !== index && 
      r.date === record.date && 
      r.position === record.position && 
      r.employee_id === record.employee_id
    );
    if (duplicates.length > 0) {
      record.errors.push(COMMON_ERRORS.DUPLICATE_ENTRY);
    }

    // Weekend RN coverage check (position codes 12000, 12100, 13000)
    if (record.date) {
      const date = new Date(record.date);
      const dayOfWeek = date.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && ['12000', '12100', '13000'].includes(record.position)) {
        const rnCoverage = allRecords.filter(r => 
          r.date === record.date && 
          ['12000', '12100', '13000'].includes(r.position) && 
          r.hours > 0
        ).reduce((total, r) => total + r.hours, 0);
        
        if (rnCoverage < 8) {
          record.warnings.push(COMMON_ERRORS.WEEKEND_RN);
        }
      }
    }
  };

  const correctPBJRecord = (record: PBJRecord): PBJRecord => {
    const corrected = { ...record, corrected: false };

    // Auto-correct date format
    if (record.date && !record.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Try to parse common date formats
      const dateFormats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
        /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
      ];

      for (const format of dateFormats) {
        const match = record.date.match(format);
        if (match) {
          let year, month, day;
          if (format === dateFormats[0] || format === dateFormats[1]) {
            [, month, day, year] = match;
          } else {
            [, year, month, day] = match;
          }
          corrected.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          corrected.corrected = true;
          break;
        }
      }
    }

    // Auto-correct common position code mistakes
    const positionCorrections: Record<string, string> = {
      'RN': '13000',
      'LPN': '14000',
      'CNA': '21000',
      'DON': '12000',
      'ADON': '12100',
      'PT': '31000',
      'OT': '32000',
      'Social Work': '41000',
      'Activities': '51000',
      'Dietary': '61000',
      'Housekeeping': '71000',
      'Maintenance': '81000'
    };

    if (positionCorrections[record.position]) {
      corrected.position = positionCorrections[record.position];
      corrected.corrected = true;
    }

    // Cap hours at 24
    if (record.hours > 24) {
      corrected.hours = 24;
      corrected.corrected = true;
    }

    // Remove errors that were fixed
    corrected.errors = record.errors.filter(error => {
      if (error === COMMON_ERRORS.INVALID_DATE && corrected.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return false;
      }
      if (error === COMMON_ERRORS.INVALID_POSITION && POSITION_CODES[corrected.position as keyof typeof POSITION_CODES]) {
        return false;
      }
      if (error === COMMON_ERRORS.INVALID_HOURS && corrected.hours >= 0 && corrected.hours <= 24) {
        return false;
      }
      return true;
    });

    return corrected;
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const text = await file.text();
      const records = await parsePBJFile(text);
      setRawData(records);

      // Validate all records
      records.forEach((record, index) => validatePBJRecord(record, index, records));

      // Generate validation results
      const result: PBJValidationResult = {
        totalRecords: records.length,
        validRecords: records.filter(r => r.errors.length === 0).length,
        errorRecords: records.filter(r => r.errors.length > 0).length,
        warningRecords: records.filter(r => r.warnings.length > 0).length,
        errors: []
      };

      // Collect all errors and warnings for detailed report
      records.forEach((record, index) => {
        record.errors.forEach(error => {
          result.errors.push({ row: index + 2, field: 'various', message: error, severity: 'error' });
        });
        record.warnings.forEach(warning => {
          result.errors.push({ row: index + 2, field: 'various', message: warning, severity: 'warning' });
        });
      });

      // Attempt corrections
      const corrected = records.map(correctPBJRecord);
      setCorrectedData(corrected);

      setValidationResult(result);
    } catch (error) {
      console.error('Error processing PBJ file:', error);
      alert('Error processing file. Please check the format and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadCorrected = () => {
    if (correctedData.length === 0) return;

    const headers = ['Date', 'Position_Code', 'Hours', 'Salary', 'Employee_ID', 'Corrected'];
    const csvContent = [
      headers.join(','),
      ...correctedData.map(record => [
        record.date,
        record.position,
        record.hours,
        record.salary ? 'TRUE' : 'FALSE',
        record.employee_id,
        record.corrected ? 'YES' : 'NO'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected_${file?.name || 'pbj_data.csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrorReport = () => {
    if (!validationResult) return;

    const reportContent = [
      'PBJ Validation Error Report',
      `Generated: ${new Date().toLocaleString()}`,
      `File: ${file?.name}`,
      '',
      'SUMMARY',
      `Total Records: ${validationResult.totalRecords}`,
      `Valid Records: ${validationResult.validRecords}`,
      `Records with Errors: ${validationResult.errorRecords}`,
      `Records with Warnings: ${validationResult.warningRecords}`,
      '',
      'DETAILED ERRORS',
      'Row,Severity,Message',
      ...validationResult.errors.map(error => 
        `${error.row},${error.severity.toUpperCase()},${error.message}`
      )
    ].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pbj_error_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            PBJ Corrector & Formatter
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Validate, correct, and format Payroll-Based Journal (PBJ) data for CMS submission
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload PBJ File</h2>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            {!file ? (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <label className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    Choose CSV file to upload
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Upload your PBJ CSV file for validation and correction
                </p>
              </div>
            ) : (
              <div>
                <FileText className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleProcessFile}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    {processing ? 'Processing...' : 'Validate & Correct'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setFile(null);
                      setValidationResult(null);
                      setRawData([]);
                      setCorrectedData([]);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Validation Results</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Records</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {validationResult.totalRecords}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Valid</span>
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {validationResult.validRecords}
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Errors</span>
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {validationResult.errorRecords}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {validationResult.warningRecords}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleDownloadCorrected}
                disabled={correctedData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Corrected File
              </button>
              
              <button
                onClick={handleDownloadErrorReport}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <FileText className="h-4 w-4" />
                Download Error Report
              </button>
              
              <button
                onClick={() => setShowCorrections(!showCorrections)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {showCorrections ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {/* Detailed Error/Warning List */}
            {showCorrections && validationResult.errors.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Issues Found ({validationResult.errors.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {validationResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-2 rounded ${
                        error.severity === 'error' 
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      }`}
                    >
                      {error.severity === 'error' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="text-sm">
                        <strong>Row {error.row}:</strong> {error.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">PBJ Format Requirements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Required CSV Columns</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Date (YYYY-MM-DD format)</li>
                <li>Position_Code (5-digit CMS code)</li>
                <li>Hours (0-24 decimal hours)</li>
                <li>Salary (TRUE/FALSE)</li>
                <li>Employee_ID (unique identifier)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Common Position Codes</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>12000 - RN Director of Nursing</div>
                <div>13000 - RN Staff</div>
                <div>14000 - LPN/LVN Staff</div>
                <div>21000 - CNA Staff</div>
                <div>31000 - Physical Therapist</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}