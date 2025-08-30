"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, FileText, Calendar, Bell, Calculator, Timer } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'chat' | 'training' | 'policy' | 'incident';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export default function FacilityDashboard() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  const [currentPPD, setCurrentPPD] = useState<number | null>(null);
  const [loadingPPD, setLoadingPPD] = useState(true);
  const [surveyCountdown, setSurveyCountdown] = useState<{days: number, hours: number, minutes: number} | null>(null);
  const [facilityAnalysis, setFacilityAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      title: 'Compliance Score',
      value: '92%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Active Staff',
      value: 156,
      change: '+8',
      trend: 'up', 
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Pending Training',
      value: 23,
      change: '-5',
      trend: 'down',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Open Incidents',
      value: 3,
      change: '+1',
      trend: 'up',
      icon: AlertTriangle,
      color: 'text-red-600'
    }
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'chat',
      title: 'Policy Review Chat',
      description: 'Discussed infection control updates with CareIQ',
      timestamp: '2 hours ago',
      user: 'Sarah Johnson'
    },
    {
      id: '2', 
      type: 'training',
      title: 'CNA Training Completed',
      description: '15 staff members completed mandatory training',
      timestamp: '4 hours ago',
      user: 'Training Department'
    },
    {
      id: '3',
      type: 'policy',
      title: 'Emergency Procedures Updated',
      description: 'Policy v2.1 approved and distributed',
      timestamp: '1 day ago',
      user: 'Admin Team'
    },
    {
      id: '4',
      type: 'incident',
      title: 'Fall Prevention Review',
      description: 'Incident investigation completed, recommendations implemented',
      timestamp: '2 days ago',
      user: 'Quality Assurance'
    }
  ]);

  const [upcomingDeadlines] = useState([
    { title: 'State Survey Window Opens', date: '2024-02-15', type: 'survey', priority: 'high' },
    { title: 'Fire Safety Training Due', date: '2024-02-10', type: 'training', priority: 'medium' },
    { title: 'MDS Coordinator Certification', date: '2024-02-20', type: 'certification', priority: 'high' },
    { title: 'Policy Review: Medication Management', date: '2024-02-12', type: 'policy', priority: 'medium' }
  ]);

  // Load current PPD data
  const loadCurrentPPD = async () => {
    if (!user?.id) return;
    
    setLoadingPPD(true);
    try {
      const { data, error } = await supabase
        .from('ppd_calculations')
        .select('ppd')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentPPD(data[0].ppd);
      }
    } catch (error) {
      console.error('Failed to load PPD data:', error);
    } finally {
      setLoadingPPD(false);
    }
  };

  // Load and calculate survey countdown from database
  const loadSurveyCountdown = async () => {
    if (!user?.id) return;
    
    try {
      const { data: surveyWindow, error } = await supabase
        .from('survey_windows')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error || !surveyWindow) {
        setSurveyCountdown(null);
        return;
      }
      
      // Calculate countdown to window start if not yet in window
      // Or countdown to window end if in window
      const now = new Date();
      const windowStart = new Date(surveyWindow.window_start);
      const windowEnd = new Date(surveyWindow.window_end);
      
      let targetDate;
      let countdownType;
      
      if (surveyWindow.is_overdue) {
        setSurveyCountdown(null);
        return;
      } else if (surveyWindow.is_in_window) {
        targetDate = windowEnd;
        countdownType = 'Window Closes';
      } else {
        targetDate = windowStart;
        countdownType = 'Window Opens';
      }
      
      const timeDiff = targetDate.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        setSurveyCountdown({ 
          days, 
          hours, 
          minutes, 
          type: countdownType,
          isInWindow: surveyWindow.is_in_window,
          state: surveyWindow.facility_state
        });
      } else {
        setSurveyCountdown(null);
      }
    } catch (error) {
      console.error('Failed to load survey countdown:', error);
      setSurveyCountdown(null);
    }
  };

  // Load facility analysis
  const loadFacilityAnalysis = async () => {
    setLoadingAnalysis(true);
    setAnalysisError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/facility-analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFacilityAnalysis(result.data);
      } else {
        const error = await response.json();
        setAnalysisError(error.error || 'Failed to load facility analysis');
      }
    } catch (error) {
      console.error('Failed to load facility analysis:', error);
      setAnalysisError('Failed to load facility analysis');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCurrentPPD();
      loadSurveyCountdown();
      
      // Update countdown every minute
      const interval = setInterval(loadSurveyCountdown, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view the facility dashboard</p>
          <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Facility Dashboard</h1>
            <div className="flex items-center gap-3">
              <Link href="/notifications" className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Bell size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 py-6 scrollable">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${metric.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="text-green-500" size={16} />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="text-red-500" size={16} />
                  ) : (
                    <div className="w-4 h-4 bg-gray-400 rounded-full" />
                  )}
                  <span className={`ml-2 text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.change} from last month
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Survey Countdown & PPD Widget Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Survey Countdown Widget */}
          {surveyCountdown ? (
            <div className={`bg-gradient-to-br rounded-lg border p-6 ${
              surveyCountdown.isInWindow 
                ? 'from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-900/30 dark:border-red-700'
                : 'from-orange-50 to-yellow-50 border-orange-200 dark:from-orange-900/20 dark:to-yellow-900/20 dark:border-orange-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  surveyCountdown.isInWindow 
                    ? 'text-red-900 dark:text-red-300'
                    : 'text-orange-900 dark:text-orange-300'
                }`}>
                  <Timer className="h-5 w-5" />
                  Survey {surveyCountdown.type}
                </h3>
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                  surveyCountdown.isInWindow
                    ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                    : 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                }`}>
                  {surveyCountdown.state}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className={`text-3xl font-bold ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>{surveyCountdown.days}</div>
                  <div className={`text-sm ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>Days</div>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>{surveyCountdown.hours}</div>
                  <div className={`text-sm ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>Hours</div>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>{surveyCountdown.minutes}</div>
                  <div className={`text-sm ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>Minutes</div>
                </div>
              </div>
              <div className="mt-4 text-center space-y-2">
                <div className={`text-sm font-medium ${
                  surveyCountdown.isInWindow 
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {surveyCountdown.isInWindow ? '🚨 Survey window is OPEN!' : '⏰ Until survey window opens'}
                </div>
                <Link 
                  href="/survey-prep" 
                  className={`inline-block hover:underline text-sm font-medium ${
                    surveyCountdown.isInWindow 
                      ? 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200'
                      : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200'
                  }`}
                >
                  {surveyCountdown.isInWindow ? 'Prepare Now →' : 'Start Preparation →'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-center flex-col">
                <Timer className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Survey Window Calculator
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                  Calculate your facility's survey window to see the countdown here.
                </p>
                <Link 
                  href="/calendar" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Calculate Survey Window
                </Link>
              </div>
            </div>
          )}

          {/* Current PPD Widget */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Current PPD
              </h3>
              <Link 
                href="/ppd-calculator" 
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm font-medium"
              >
                View Calculator
              </Link>
            </div>
            <div className="text-center">
              {loadingPPD ? (
                <div className="animate-pulse">
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">--</div>
                </div>
              ) : currentPPD !== null ? (
                <>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">{currentPPD.toFixed(2)}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Hours Per Patient Day</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">Latest calculation</div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400 mb-2">No PPD Data</div>
                  <Link 
                    href="/ppd-calculator" 
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm font-medium underline"
                  >
                    Calculate Your First PPD →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Facility Analysis Widget */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Facility Performance Analysis
                </h2>
                <button
                  onClick={loadFacilityAnalysis}
                  disabled={loadingAnalysis}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {loadingAnalysis ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {loadingAnalysis ? 'Analyzing...' : 'Analyze Facility'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {analysisError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                    {analysisError}
                  </div>
                  <button
                    onClick={loadFacilityAnalysis}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : facilityAnalysis ? (
                <div className="space-y-6">
                  {/* Facility Overview */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {facilityAnalysis.facility.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{facilityAnalysis.facility.overallRating ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Overall (out of 5)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{facilityAnalysis.facility.healthInspections ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Health Inspections (out of 5)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{facilityAnalysis.facility.qualityMeasures ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Quality (out of 5)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{facilityAnalysis.facility.staffing ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Staffing (out of 5)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{facilityAnalysis.facility.shortStay ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Short Stay (out of 5)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">{facilityAnalysis.facility.longStay ?? 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Long Stay (out of 5)</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">🎯 Priority Improvement Areas</h4>
                      <ul className="space-y-2">
                        {facilityAnalysis.analysis.priorityAreas?.map((area: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">⭐ Star Rating Strategies</h4>
                      <ul className="space-y-2">
                        {facilityAnalysis.analysis.starRatingStrategies?.map((strategy: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">📋 Staff Training Focus</h4>
                      <ul className="space-y-2">
                        {facilityAnalysis.analysis.staffTraining?.map((training: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {training}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">✅ Quality Enhancements</h4>
                      <ul className="space-y-2">
                        {facilityAnalysis.analysis.qualityEnhancements?.map((enhancement: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {enhancement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    Analysis generated on {new Date(facilityAnalysis.generatedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    AI-Powered Facility Analysis
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                    Get personalized improvement recommendations based on your facility's Medicare Care Compare data and star ratings.
                  </p>
                  <button
                    onClick={loadFacilityAnalysis}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Generate Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const typeIcons = {
                      chat: '💬',
                      training: '🎓',
                      policy: '📋',
                      incident: '⚠️'
                    };
                    
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="text-2xl">{typeIcons[activity.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {activity.description}
                          </p>
                          <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{activity.timestamp}</span>
                            {activity.user && (
                              <>
                                <span>•</span>
                                <span>{activity.user}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline, index) => {
                    const daysUntil = Math.ceil((new Date(deadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 7;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                            {deadline.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {daysUntil} days left • {deadline.type}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          deadline.priority === 'high' ? 'bg-red-500' : 'bg-orange-500'
                        }`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Link href="/mock-survey-training" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors">
                    <span className="text-blue-600 dark:text-blue-400">🎯</span>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Start Survey Prep</span>
                  </Link>
                  <Link href="/chat/new?message=Create a staff training plan for this month"
                        className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors">
                    <span className="text-green-600 dark:text-green-400">📚</span>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Plan Training</span>
                  </Link>
                  <Link href="/chat/new?message=Review our current policies and suggest updates"
                        className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-colors">
                    <span className="text-purple-600 dark:text-purple-400">📋</span>
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Review Policies</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}