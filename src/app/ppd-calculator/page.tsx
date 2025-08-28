// src/app/ppd-calculator/page.tsx - PPD Calculator with staffing uploads and reporting
"use client";

import { useState, useEffect } from 'react';
import { Upload, Calculator, FileText, BarChart3, Calendar, Users, Clock, Download, Trash2 } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('ppd_calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setCalculations(data || []);
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
      const { error } = await supabase
        .from('ppd_calculations')
        .insert({
          user_id: user.id,
          date: staffingData.date,
          census: staffingData.census,
          rn_hours: staffingData.rn_hours,
          lpn_hours: staffingData.lpn_hours,
          cna_hours: staffingData.cna_hours,
          total_nursing_hours,
          ppd
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
        .from('ppd_calculations')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
        
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
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
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400 mb-2">Preview Calculation:</h3>
              <div className="text-sm text-green-700 dark:text-green-300">
                Total Nursing Hours: {calculatePPD(manualData).total_nursing_hours} hours<br />
                PPD: {calculatePPD(manualData).ppd} hours per patient day
              </div>
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
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-green-800 dark:text-green-400 text-sm font-medium">Average PPD</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">
              {avgPPD.toFixed(2)}
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
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCalculations.slice(0, 20).map((calc) => (
                <tr key={calc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2">{new Date(calc.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{calc.census}</td>
                  <td className="px-4 py-2 text-right">{calc.rn_hours}</td>
                  <td className="px-4 py-2 text-right">{calc.lpn_hours}</td>
                  <td className="px-4 py-2 text-right">{calc.cna_hours}</td>
                  <td className="px-4 py-2 text-right">{calc.total_nursing_hours}</td>
                  <td className="px-4 py-2 text-right font-semibold">{calc.ppd}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => deleteCalculation(calc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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