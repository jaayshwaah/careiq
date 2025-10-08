// src/app/page.tsx - Unified CareIQ Homepage & Dashboard
"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, FileText, MessageCircle, Shield, ClipboardList, BarChart3, 
  Users, Activity, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, 
  Clock, RefreshCw, Calculator, Sparkles, Calendar, Bell, BookOpen, Timer
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const suggestions = [
  "What are the key CMS survey preparation steps?",
  "Create a staff training checklist for CNAs", 
  "Summarize infection control requirements",
  "Draft a policy update memo",
  "Help me prepare for a state inspection",
  "Analyze care plan compliance and quality"
];

const quickActions = [
  {
    id: 'new-chat',
    title: 'Start New Chat',
    description: 'AI-powered conversation',
    icon: MessageCircle,
    href: '/chat/new',
    color: 'var(--accent)'
  },
  {
    id: 'daily-rounds',
    title: 'Daily Rounds',
    description: 'Digital rounding process',
    icon: ClipboardList,
    href: '/daily-rounds',
    color: 'var(--info)'
  },
  {
    id: 'compliance',
    title: 'Compliance Check',
    description: 'F-Tag monitoring',
    icon: Shield,
    href: '/compliance',
    color: 'var(--warn)'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Performance metrics',
    icon: BarChart3,
    href: '/analytics',
    color: 'var(--ok)'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, userProfile } = useAuth();
  const supabase = getBrowserSupabase();
  
  // Chat state
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dashboard state
  const [currentPPD, setCurrentPPD] = useState<number | null>(null);
  const [loadingPPD, setLoadingPPD] = useState(true);
  const [surveyCountdown, setSurveyCountdown] = useState<any>(null);
  const [complianceScore, setComplianceScore] = useState<{score: number, status: string} | null>(null);
  const [facilityAnalysis, setFacilityAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Helper function to render star ratings
  const renderStars = (rating: number | null) => {
    if (!rating) return '☆☆☆☆☆';
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? '★' : '☆');
    }
    return stars.join('');
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Load dashboard data on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCurrentPPD();
      loadSurveyCountdown();
      loadComplianceScore();
      loadFacilityAnalysis();
      
      const interval = setInterval(loadSurveyCountdown, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadCurrentPPD = async () => {
    if (!user?.id) return;
    setLoadingPPD(true);
    try {
      const { data } = await supabase
        .from('ppd_calculations')
        .select('ppd')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setCurrentPPD(data[0].ppd);
      }
    } catch (error) {
      console.error('Failed to load PPD:', error);
    } finally {
      setLoadingPPD(false);
    }
  };

  const loadSurveyCountdown = async () => {
    if (!user?.id) return;
    try {
      const { data: surveyPrep } = await supabase
        .from('survey_prep_progress')
        .select('expected_survey_date, facility_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (surveyPrep?.expected_survey_date) {
        const now = new Date();
        const expectedDate = new Date(surveyPrep.expected_survey_date);
        const windowStart = new Date(expectedDate);
        windowStart.setMonth(expectedDate.getMonth() - 3);
        
        const targetDate = now >= windowStart ? expectedDate : windowStart;
        const timeDiff = targetDate.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          setSurveyCountdown({ days, hours, minutes, isInWindow: now >= windowStart });
        }
      }
    } catch (error) {
      console.error('Failed to load survey countdown:', error);
    }
  };

  const loadComplianceScore = async () => {
    try {
      const response = await fetch('/api/survey-prep');
      if (response.ok) {
        const data = await response.json();
        const totalItems = Object.values(data.sections || {}).reduce((sum: number, section: any) => sum + section.items.length, 0);
        const completedItems = Object.keys(data.progress || {}).filter(key => data.progress[key]).length;
        const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        let status = '';
        if (score >= 90) status = 'Excellent';
        else if (score >= 80) status = 'Good';
        else if (score >= 70) status = 'Fair';
        else if (score >= 50) status = 'Needs Work';
        else status = 'Critical';
        
        setComplianceScore({ score, status });
      }
    } catch (error) {
      console.error('Failed to load compliance score:', error);
    }
  };

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

  const refreshAll = () => {
    loadCurrentPPD();
    loadSurveyCountdown();
    loadComplianceScore();
    loadFacilityAnalysis();
  };

  const createNewChat = async (initialMessage?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          title: initialMessage ? initialMessage.slice(0, 50) + '...' : 'New chat'
        }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          const params = initialMessage ? `?message=${encodeURIComponent(initialMessage)}` : '';
          router.push(`/chat/${chat.id}${params}`);
        }
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isCreating) {
      createNewChat(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleCarePlanAnalysis = async (file: File) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/care-plan-analysis', {
        method: 'POST',
        headers: { 'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '' },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const analysisMessage = `I've analyzed the care plan document "${file.name}". Please provide detailed guidance on improving this care plan.`;
        createNewChat(analysisMessage);
      }
    } catch (error) {
      console.error('Care plan analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleCarePlanAnalysis(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}
          </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              {userProfile?.facility_name || 'CareIQ'} Dashboard
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200/50 dark:border-gray-700/50"
          >
            <RefreshCw size={16} className="text-gray-700 dark:text-gray-300 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Refresh</span>
          </button>
        </motion.div>

        {/* Top Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* PPD Card */}
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <Link href="/ppd-calculator">
                  <Calculator className="w-5 h-5 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors" />
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current PPD</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loadingPPD ? '—' : currentPPD ? currentPPD.toFixed(3) : 'Not set'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  {currentPPD && currentPPD >= 1.0 ? (
                    <><CheckCircle className="w-3 h-3 text-green-500" /> Compliant</>
                  ) : (
                    'Click to calculate'
                  )}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Survey Countdown Card */}
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/25">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <Link href="/survey-prep">
                  <Calendar className="w-5 h-5 text-gray-400 hover:text-orange-600 cursor-pointer transition-colors" />
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {surveyCountdown?.isInWindow ? 'Survey Window' : 'Next Survey'}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {surveyCountdown ? `${surveyCountdown.days}d ${surveyCountdown.hours}h` : 'Not set'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  {surveyCountdown?.isInWindow ? (
                    <><AlertTriangle className="w-3 h-3 text-orange-500" /> In window</>
                  ) : (
                    'Until window opens'
                  )}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Compliance Score Card */}
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/25">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <Link href="/survey-prep">
                  <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-600 cursor-pointer transition-colors" />
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {complianceScore ? `${complianceScore.score}%` : '—'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {complianceScore?.status || 'No data yet'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Star Rating Card */}
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl shadow-lg shadow-yellow-500/25">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Rating</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {facilityAnalysis?.facility?.overallRating ? renderStars(facilityAnalysis.facility.overallRating) : '☆☆☆☆☆'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {facilityAnalysis ? 'CMS Care Compare' : 'Generate analysis'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Facility Analysis Section */}
        {facilityAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Facility Performance Analysis</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Medicare Care Compare data and AI recommendations</p>
                  </div>
                  <button
                    onClick={loadFacilityAnalysis}
                    disabled={loadingAnalysis}
                    className="px-4 py-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-xl rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200/50 dark:border-gray-600/50 disabled:opacity-50"
                  >
                    {loadingAnalysis ? <RefreshCw className="w-4 h-4 animate-spin text-gray-700 dark:text-gray-300" /> : <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Refresh</span>}
                  </button>
                        </div>
                      </div>
              <div className="p-6 md:p-8 space-y-6">
                {/* Star Ratings Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-700/30">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Health Inspections</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {renderStars(facilityAnalysis.facility?.healthInspectionRating)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 backdrop-blur-sm rounded-xl border border-green-200/30 dark:border-green-700/30">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Staffing</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {renderStars(facilityAnalysis.facility?.staffingRating)}
                    </p>
                    </div>
                  <div className="p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 backdrop-blur-sm rounded-xl border border-purple-200/30 dark:border-purple-700/30">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Quality Measures</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {renderStars(facilityAnalysis.facility?.qualityRating)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/10 dark:to-orange-900/10 backdrop-blur-sm rounded-xl border border-yellow-200/30 dark:border-yellow-700/30">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Overall</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {renderStars(facilityAnalysis.facility?.overallRating)}
                    </p>
                    </div>
                    </div>

                {/* Top Recommendations */}
                {facilityAnalysis.analysis?.immediateActions && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Immediate Actions (Next 30 Days)</h4>
                    <ul className="space-y-2">
                      {facilityAnalysis.analysis.immediateActions.slice(0, 3).map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group cursor-pointer"
                onClick={() => router.push(action.href)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg shadow-blue-500/25">
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{action.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Chat Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
          <div className="relative">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Ask CareIQ</h2>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                {/* Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suggestions.map((suggestion, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isCreating}
                      className="text-left p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-700/50 dark:to-gray-600/50 hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200 disabled:opacity-50 text-sm text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 shadow-sm"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about compliance, operations, or care planning..."
                    disabled={isCreating}
                    className="w-full resize-none rounded-2xl px-5 py-4 pr-14 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 border border-gray-200/50 dark:border-gray-600/50 shadow-sm backdrop-blur-sm transition-all"
                    style={{ minHeight: '100px', maxHeight: '200px' }}
                    rows={3}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!message.trim() || isCreating}
                    className="absolute right-3 bottom-3 w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white transition-all shadow-lg disabled:shadow-none"
                  >
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </motion.button>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to send • <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Shift+Enter</kbd> for new line
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}