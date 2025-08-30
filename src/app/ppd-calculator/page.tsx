// src/app/ppd-calculator/page.tsx - PPD Calculator with staffing uploads and reporting
"use client";

import { useState, useEffect } from 'react';
import { Upload, Calculator, FileText, BarChart3, Calendar, Users, Clock, Download, Trash2, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface PPDCalculation {
  id: string;
  date: string;
  census: number;
  rn_hours: number;
  lpn_hours: number;
  cna_hours: number;
  total_nursing_hours: number;
  ppd: number;
  created_at: string;
  user_id: string;
}

interface StaffingData {
  date: string;
  census: number;
  rn_hours: number;
  lpn_hours: number;
  cna_hours: number;
}

export default function PPDCalculatorPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<PPDCalculation[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  
  // Manual entry state
  const [manualData, setManualData] = useState<StaffingData>({
    date: new Date().toISOString().split('T')[0],
    census: 0,
    rn_hours: 0,
    lpn_hours: 0,
    cna_hours: 0
  });
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  
  // Reporting filters
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadCalculations();
  }, [isAuthenticated, user]);

  const loadCalculations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get PPD calculations from knowledge_base table
      const { data: allData, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Filter for PPD calculation records and parse them
      const ppdData = allData?.filter(record => record.metadata?.content_type === 'ppd_calculation').map(record => {
        try {
          const content = JSON.parse(record.content);
          return {
            ...content,
            id: record.id,
            created_at: record.created_at
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean).slice(0, 50) || [];
      
      setCalculations(ppdData);
    } catch (error) {
      console.error('Failed to load PPD calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePPD = (staffingData: StaffingData) => {
    const totalNursingHours = staffingData.rn_hours + staffingData.lpn_hours + staffingData.cna_hours;
    const ppd = staffingData.census > 0 ? totalNursingHours / staffingData.census : 0;
    return {
      total_nursing_hours: totalNursingHours,
      ppd: Math.round(ppd * 100) / 100 // Round to 2 decimal places
    };
  };

  const saveCalculation = async (staffingData: StaffingData) => {
    if (!user?.id) return;
    
    const { total_nursing_hours, ppd } = calculatePPD(staffingData);
    
    try {
      // Save to knowledge_base table
      const calculationRecord = {
        user_id: user.id,
        date: staffingData.date,
        census: staffingData.census,
        rn_hours: staffingData.rn_hours,
        lpn_hours: staffingData.lpn_hours,
        cna_hours: staffingData.cna_hours,
        total_nursing_hours,
        ppd
      };

      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title: `PPD Calculation - ${staffingData.date}`,
          content: JSON.stringify(calculationRecord),
          created_by: user.id,
          facility_id: null,
          metadata: {
            content_type: 'ppd_calculation',
            calculation_date: staffingData.date,
            ppd_value: ppd,
            census: staffingData.census
          }
        });
        
      if (error) throw error;
      
      await loadCalculations();
      
      // Reset manual form
      setManualData({
        date: new Date().toISOString().split('T')[0],
        census: 0,
        rn_hours: 0,
        lpn_hours: 0,
        cna_hours: 0
      });
      
    } catch (error) {
      console.error('Failed to save PPD calculation:', error);
      alert('Failed to save calculation. Please try again.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualData.census <= 0) {
      alert('Census must be greater than 0');
      return;
    }
    saveCalculation(manualData);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user?.id) return;
    
    setLoading(true);
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n');
      const results: any[] = [];
      
      // Skip header row if present
      const dataLines = lines[0].includes('Date') || lines[0].includes('date') ? lines.slice(1) : lines;
      
      for (const line of dataLines) {
        if (!line.trim()) continue;
        
        const columns = line.split(',').map(col => col.trim());
        if (columns.length < 5) continue;
        
        try {
          const staffingData: StaffingData = {
            date: columns[0],
            census: parseFloat(columns[1]) || 0,
            rn_hours: parseFloat(columns[2]) || 0,
            lpn_hours: parseFloat(columns[3]) || 0,
            cna_hours: parseFloat(columns[4]) || 0
          };
          
          if (staffingData.census > 0) {
            await saveCalculation(staffingData);
            results.push({ ...staffingData, status: 'success' });
          } else {
            results.push({ ...staffingData, status: 'error', error: 'Invalid census' });
          }
        } catch (error) {
          results.push({ line, status: 'error', error: 'Parse error' });
        }
      }
      
      setUploadResults(results);
      setSelectedFile(null);
      
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to process file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const deleteCalculation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calculation?')) return;
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
        .eq('created_by', user?.id);
        
      if (error) throw error;
      await loadCalculations();
    } catch (error) {
      console.error('Failed to delete calculation:', error);
    }
  };

  const exportReport = () => {
    const filteredCalculations = calculations.filter(calc => {
      const calcDate = new Date(calc.date);
      return calcDate >= new Date(dateRange.start) && calcDate <= new Date(dateRange.end);
    });
    
    const csvContent = [
      ['Date', 'Census', 'RN Hours', 'LPN Hours', 'CNA Hours', 'Total Nursing Hours', 'PPD'].join(','),
      ...filteredCalculations.map(calc => [
        calc.date,
        calc.census,
        calc.rn_hours,
        calc.lpn_hours,
        calc.cna_hours,
        calc.total_nursing_hours,
        calc.ppd
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppd-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return null;
  }

  const filteredCalculations = calculations.filter(calc => {
    const calcDate = new Date(calc.date);
    return calcDate >= new Date(dateRange.start) && calcDate <= new Date(dateRange.end);
  });

  const avgPPD = filteredCalculations.length > 0 
    ? filteredCalculations.reduce((sum, calc) => sum + calc.ppd, 0) / filteredCalculations.length 
    : 0;

  // Compliance thresholds and guidance
  const complianceThresholds = {
    minimum_ppd: 3.2, // CMS minimum PPD requirement
    rn_minimum: 0.75, // RN hours per patient day minimum
    total_nursing_minimum: 3.2
  };

  const getComplianceStatus = (calculation: PPDCalculation) => {
    const rnPPD = calculation.census > 0 ? calculation.rn_hours / calculation.census : 0;
    const issues = [];
    
    if (calculation.ppd < complianceThresholds.minimum_ppd) {
      issues.push(`Total PPD (${calculation.ppd}) below CMS minimum (${complianceThresholds.minimum_ppd})`);
    }
    if (rnPPD < complianceThresholds.rn_minimum) {
      issues.push(`RN PPD (${rnPPD.toFixed(2)}) below CMS minimum (${complianceThresholds.rn_minimum})`);
    }
    
    return {
      isCompliant: issues.length === 0,
      issues,
      rnPPD: rnPPD.toFixed(2)
    };
  };

  const getNonCompliantDays = () => {
    return filteredCalculations.filter(calc => !getComplianceStatus(calc).isCompliant).length;
  };

  // Calculate potential fines for non-compliance
  const calculateFineEstimate = (calc: PPDCalculation) => {
    const compliance = getComplianceStatus(calc);
    if (compliance.isCompliant) return null;

    // CMS fine structure (estimates based on typical ranges)
    const baseFinePerDay = 5000; // Base fine per day of non-compliance
    const severityMultiplier = calc.ppd < 2.5 ? 2.0 : calc.ppd < 3.0 ? 1.5 : 1.0;
    const estimatedDailyFine = baseFinePerDay * severityMultiplier;
    
    // Additional considerations
    const rnShortage = Math.max(0, (0.75 * calc.census) - calc.rn_hours);
    const rnFineMultiplier = rnShortage > 0 ? 1.5 : 1.0;
    
    const totalDailyFine = estimatedDailyFine * rnFineMultiplier;
    
    return {
      dailyFine: totalDailyFine,
      deficiencyLevel: calc.ppd < 2.5 ? 'Immediate Jeopardy' : calc.ppd < 3.0 ? 'Actual Harm' : 'Standard Level',
      rnShortage: rnShortage,
      severity: severityMultiplier,
      note: 'Estimates based on typical CMS enforcement patterns. Actual fines vary by state and circumstances.'
    };
  };

  // Calculate recommended staffing based on census
  const getStaffingRecommendations = (census: number) => {
    if (census <= 0) return null;

    // CMS minimum requirements
    const minTotalPPD = 3.2;
    const minRNPPD = 0.75;
    const minLPNPPD = 2.45; // 3.2 total - 0.75 RN = 2.45 for LPN/CNA combined, split as 1.2 LPN + 1.25 CNA
    const minCNAPPD = 1.25; // Estimated CNA portion from total LPN/CNA requirement
    
    // Recommended staffing levels (higher than minimums for better care)
    const recommendedTotalPPD = 4.1; // Industry best practice
    const recommendedRNLPNPPD = 2.0; // Combined RN + LPN hours
    const recommendedCNAPPD = 2.1;

    // Calculate minimum hours
    const minTotalHours = Math.ceil(census * minTotalPPD);
    const minRNHours = Math.ceil(census * minRNPPD);
    const minLPNHours = Math.ceil(census * (minLPNPPD - minCNAPPD)); // LPN portion only
    const minRNLPNHours = minRNHours + minLPNHours;
    const minCNAHours = Math.ceil(census * minCNAPPD);
    
    // Calculate recommended hours  
    const recRNLPNHours = Math.ceil(census * recommendedRNLPNPPD);
    const recCNAHours = Math.ceil(census * recommendedCNAPPD);
    const recTotalHours = recRNLPNHours + recCNAHours;

    return {
      census,
      minimum: {
        total_hours: minTotalHours,
        total_ppd: minTotalPPD,
        rn_lpn_hours: minRNLPNHours,
        rn_lpn_ppd: (minRNLPNHours / census).toFixed(2),
        cna_hours: minCNAHours,
        cna_ppd: minCNAPPD,
        // Keep legacy fields for backward compatibility
        rn_hours: minRNHours,
        rn_ppd: minRNPPD,
        remaining_hours: minTotalHours - minRNHours
      },
      recommended: {
        rn_lpn_hours: recRNLPNHours,
        rn_lpn_ppd: recommendedRNLPNPPD,
        cna_hours: recCNAHours,
        cna_ppd: recommendedCNAPPD,
        total_hours: recTotalHours,
        total_ppd: (recTotalHours / census).toFixed(2)
      },
      guidance: [
        'Minimum 24/7 RN coverage required by CMS',
        'Consider resident acuity when scheduling',
        'Weekend staffing often requires adjustment',
        'Holiday coverage may need additional planning',
        'On-call staff should supplement, not replace, scheduled staff'
      ]
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 lg:px-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600/90 to-green-700/90 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Calculator size={24} />
          PPD Calculator
        </h1>
        <p className="text-green-100">
          Calculate Per Patient Day (PPD) nursing hours and track staffing ratios over time.
        </p>
      </div>

      {/* Action Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowUpload(false)}
          className={`px-4 py-2 font-medium ${!showUpload 
            ? 'border-b-2 border-green-600 text-green-600' 
            : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setShowUpload(true)}
          className={`px-4 py-2 font-medium ${showUpload 
            ? 'border-b-2 border-green-600 text-green-600' 
            : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bulk Upload
        </button>
      </div>

      {/* Manual Entry Form */}
      {!showUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Enter Daily Staffing Data</h2>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={manualData.date}
                onChange={(e) => setManualData({...manualData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Census</label>
              <input
                type="number"
                min="1"
                value={manualData.census || ''}
                onChange={(e) => setManualData({...manualData, census: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RN Hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={manualData.rn_hours || ''}
                onChange={(e) => setManualData({...manualData, rn_hours: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LPN Hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={manualData.lpn_hours || ''}
                onChange={(e) => setManualData({...manualData, lpn_hours: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CNA Hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={manualData.cna_hours || ''}
                onChange={(e) => setManualData({...manualData, cna_hours: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Calculate PPD'}
              </button>
            </div>
          </form>
          
          {manualData.census > 0 && (
            <div className="mt-6 space-y-4">
              {/* Current Calculation Preview */}
              {(manualData.rn_hours > 0 || manualData.lpn_hours > 0 || manualData.cna_hours > 0) && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-medium text-green-800 dark:text-green-400 mb-2">Preview Calculation:</h3>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Total Nursing Hours: {calculatePPD(manualData).total_nursing_hours} hours<br />
                    PPD: {calculatePPD(manualData).ppd} hours per patient day
                  </div>
                </div>
              )}

              {/* Staffing Recommendations */}
              {(() => {
                const recommendations = getStaffingRecommendations(manualData.census);
                if (!recommendations) return null;

                return (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-3">
                      Staffing Guidance for {manualData.census} Residents
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Minimum Requirements */}
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
                        <h4 className="font-medium text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          CMS Minimum Requirements
                        </h4>
                        <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                          <div>RN + LPN: {recommendations.minimum.rn_lpn_hours} hours ({recommendations.minimum.rn_lpn_ppd} PPD)</div>
                          <div>CNA: {recommendations.minimum.cna_hours} hours ({recommendations.minimum.cna_ppd} PPD)</div>
                          <div className="font-medium pt-1 border-t border-red-200">Total: {recommendations.minimum.total_hours} hours ({recommendations.minimum.total_ppd} PPD)</div>
                        </div>
                      </div>

                      {/* Best Practice Recommendations */}
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                        <h4 className="font-medium text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Recommended Best Practice
                        </h4>
                        <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                          <div>RN + LPN: {recommendations.recommended.rn_lpn_hours} hours ({recommendations.recommended.rn_lpn_ppd} PPD)</div>
                          <div>CNA: {recommendations.recommended.cna_hours} hours ({recommendations.recommended.cna_ppd} PPD)</div>
                          <div className="font-medium pt-1 border-t border-green-200">Total: {recommendations.recommended.total_hours} hours ({recommendations.recommended.total_ppd} PPD)</div>
                        </div>
                      </div>
                    </div>

                    {/* Guidance Notes */}
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">Staffing Guidance:</h4>
                      <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                        {recommendations.guidance.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* File Upload Form */}
      {showUpload && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Bulk Upload Staffing Data</h2>
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-2">CSV Format Required:</h3>
            <code className="text-sm text-blue-700 dark:text-blue-300">
              Date,Census,RN_Hours,LPN_Hours,CNA_Hours<br />
              2024-01-15,45,24,16,32<br />
              2024-01-16,47,24,16,36
            </code>
          </div>
          
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upload & Calculate'}
            </button>
          </form>
          
          {uploadResults.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">Upload Results:</h3>
              <div className="text-sm">
                Success: {uploadResults.filter(r => r.status === 'success').length}<br />
                Errors: {uploadResults.filter(r => r.status === 'error').length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reporting Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 size={20} />
            PPD Reports & Analytics
          </h2>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        {/* Compliance Alert */}
        {getNonCompliantDays() > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800 dark:text-red-400">Compliance Alert</h3>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mb-3">
              {getNonCompliantDays()} day(s) in the selected period fall below CMS staffing requirements.
            </p>
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded">
              <strong>CMS Requirements:</strong><br />
              • Minimum 3.2 total nursing hours per patient day<br />
              • Minimum 0.75 RN hours per patient day<br />
              • 24/7 RN coverage required
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-green-800 dark:text-green-400 text-sm font-medium">Average PPD</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">
              {avgPPD.toFixed(2)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {avgPPD >= complianceThresholds.minimum_ppd ? '✓ Compliant' : '⚠ Below minimum'}
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-blue-800 dark:text-blue-400 text-sm font-medium">Total Days</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {filteredCalculations.length}
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-purple-800 dark:text-purple-400 text-sm font-medium">Avg Census</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              {filteredCalculations.length > 0 
                ? (filteredCalculations.reduce((sum, calc) => sum + calc.census, 0) / filteredCalculations.length).toFixed(0)
                : '0'
              }
            </div>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-orange-800 dark:text-orange-400 text-sm font-medium">Non-Compliant Days</div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {getNonCompliantDays()}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {getNonCompliantDays() === 0 ? '✓ All compliant' : 'Needs attention'}
            </div>
          </div>
        </div>
        
        {/* Recent Calculations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Census</th>
                <th className="px-4 py-2 text-right">RN Hours</th>
                <th className="px-4 py-2 text-right">LPN Hours</th>
                <th className="px-4 py-2 text-right">CNA Hours</th>
                <th className="px-4 py-2 text-right">Total Hours</th>
                <th className="px-4 py-2 text-right">PPD</th>
                <th className="px-4 py-2 text-center">Compliance</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCalculations.slice(0, 20).map((calc) => {
                const compliance = getComplianceStatus(calc);
                return (
                  <tr key={calc.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !compliance.isCompliant ? 'bg-red-50 dark:bg-red-900/10' : ''
                  }`}>
                    <td className="px-4 py-2">{new Date(calc.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">{calc.census}</td>
                    <td className="px-4 py-2 text-right">
                      {calc.rn_hours}
                      <div className="text-xs text-gray-500">
                        ({compliance.rnPPD} PPD)
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{calc.lpn_hours}</td>
                    <td className="px-4 py-2 text-right">{calc.cna_hours}</td>
                    <td className="px-4 py-2 text-right">{calc.total_nursing_hours}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${
                      calc.ppd < complianceThresholds.minimum_ppd ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {calc.ppd}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {compliance.isCompliant ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          <CheckCircle size={12} />
                          Compliant
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          <AlertTriangle size={12} />
                          Issues
                        </div>
                      )}
                      {!compliance.isCompliant && (
                        <div className="mt-1">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-red-600 hover:text-red-800">
                              View Issues
                            </summary>
                            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                              {compliance.issues.map((issue, idx) => (
                                <div key={idx}>• {issue}</div>
                              ))}
                              {(() => {
                                const fineEstimate = calculateFineEstimate(calc);
                                if (!fineEstimate) return null;
                                return (
                                  <div className="mt-2 pt-2 border-t border-red-300">
                                    <div className="font-medium text-red-800">Potential Fine Risk:</div>
                                    <div>Est. Daily Fine: <span className="font-mono">${fineEstimate.dailyFine.toLocaleString()}</span></div>
                                    <div>Deficiency Level: <span className="font-medium">{fineEstimate.deficiencyLevel}</span></div>
                                    {fineEstimate.rnShortage > 0 && (
                                      <div>RN Shortage: {fineEstimate.rnShortage.toFixed(1)} hours</div>
                                    )}
                                    <div className="text-xs mt-1 text-red-600">{fineEstimate.note}</div>
                                  </div>
                                );
                              })()}
                            </div>
                          </details>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredCalculations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No PPD calculations found for the selected date range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}