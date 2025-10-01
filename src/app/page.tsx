// src/app/page.tsx - Enhanced CareIQ homepage with design system
"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, Upload, Plus, MessageCircle, Shield, ClipboardList, BarChart3, Users, Activity, TrendingUp, CheckCircle, AlertTriangle, Clock, BookOpen, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const suggestions = [
  "What are the key CMS survey preparation steps?",
  "Create a staff training checklist for CNAs", 
  "Summarize infection control requirements",
  "Draft a policy update memo",
  "Explain MDS assessment timelines",
  "Review medication administration protocols",
  "Generate a mock survey question set",
  "Create incident investigation checklist",
  "What training is required for new employees?",
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
    href: '/daily-ops',
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

const dashboardWidgets = [
  {
    id: 'census',
    title: 'Current Census',
    value: '120/150',
    change: '+5 from yesterday',
    trend: 'up',
    icon: Users,
    color: 'var(--info)'
  },
  {
    id: 'ppd',
    title: 'PPD Compliance',
    value: '1.125',
    change: 'Compliant',
    trend: 'up',
    icon: Activity,
    color: 'var(--ok)'
  },
  {
    id: 'incidents',
    title: 'Open Incidents',
    value: '3',
    change: '2 resolved today',
    trend: 'down',
    icon: AlertTriangle,
    color: 'var(--warn)'
  },
  {
    id: 'tasks',
    title: 'Pending Tasks',
    value: '7',
    change: '3 completed today',
    trend: 'down',
    icon: CheckCircle,
    color: 'var(--info)'
  }
];

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

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
        } else {
          throw new Error('No chat ID returned');
        }
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      const chatId = crypto.randomUUID();
      const params = initialMessage ? `?message=${encodeURIComponent(initialMessage)}` : '';
      router.push(`/chat/${chatId}${params}`);
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
    // Support Ctrl/Cmd + Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    // focus composer
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleCarePlanAnalysis = async (file: File) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/care-plan-analysis', {
        method: 'POST',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        
        // Create a new chat with the analysis results
        const analysisMessage = `I've analyzed the care plan document "${file.name}". Here's what I found:

**Resident:** ${result.analysis.residentName}
**Diagnoses:** ${result.analysis.diagnosis.join(', ')}
**Care Goals:** ${result.analysis.careGoals.join(', ')}
**Key Interventions:** ${result.analysis.interventions.join(', ')}
**Medications:** ${result.analysis.medications.join(', ')}
**Risk Factors:** ${result.analysis.riskFactors.join(', ')}
**Compliance Issues:** ${result.analysis.complianceIssues.length > 0 ? result.analysis.complianceIssues.join(', ') : 'None identified'}
**Recommendations:** ${result.analysis.recommendations.join(', ')}

Please provide detailed guidance on improving this care plan and ensuring CMS compliance.`;
        
        createNewChat(analysisMessage);
      } else {
        throw new Error('Failed to analyze care plan');
      }
    } catch (error) {
      console.error('Care plan analysis error:', error);
      setMessage(`I tried to analyze the care plan document but encountered an error. Please try uploading it again or ask me to help with care plan analysis in a different way.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCarePlanAnalysis(file);
    }
  };

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Welcome to CareIQ
          </h1>
          <p className="text-[var(--muted)] text-lg">
            AI-powered nursing home operations and compliance
          </p>
        </motion.div>

        {/* Dashboard Widgets */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {dashboardWidgets.map((widget, index) => (
            <motion.div
              key={widget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card variant="glass" className="hover:shadow-[var(--shadow-popover)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-[var(--radius-md)]"
                        style={{ backgroundColor: `${widget.color}20` }}
                      >
                        <widget.icon size={20} style={{ color: widget.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {widget.title}
                        </div>
                      </div>
                    </div>
                    {widget.trend === 'up' ? (
                      <TrendingUp size={16} className="text-[var(--ok)]" />
                    ) : widget.trend === 'down' ? (
                      <TrendingUp size={16} className="text-[var(--err)] rotate-180" />
                    ) : (
                      <Activity size={16} className="text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                      {widget.value}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {widget.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  variant="glass"
                  interactive
                  className="h-full cursor-pointer"
                  onClick={() => window.location.href = action.href}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-3 rounded-[var(--radius-md)]"
                        style={{ backgroundColor: `${action.color}20` }}
                      >
                        <action.icon size={24} style={{ color: action.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {action.title}
                        </h3>
                        <p className="text-sm text-[var(--muted)]">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Chat Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Start a Conversation
          </h2>
          <Card variant="glass" className="p-6">
            <div className="space-y-4">
              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.slice(0, 6).map((suggestion, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isCreating}
                    className="text-left p-3 rounded-[var(--radius-md)] bg-[var(--muted)]/30 hover:bg-[var(--muted)]/50 transition-standard disabled:opacity-50 group"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {suggestion}
                    </div>
                  </motion.button>
                ))}
                
                {/* Care Plan Analysis Button */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isAnalyzing || isCreating}
                  />
                  <motion.button
                    disabled={isAnalyzing || isCreating}
                    className="w-full text-left p-3 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--ok)]/20 to-[var(--ok)]/10 hover:from-[var(--ok)]/30 hover:to-[var(--ok)]/20 transition-standard disabled:opacity-50 group"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isAnalyzing ? (
                          <div className="w-5 h-5 border-2 border-[var(--ok)] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText className="w-5 h-5 text-[var(--ok)]" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--ok)] group-hover:text-[var(--ok)] transition-colors">
                          {isAnalyzing ? 'Analyzing Care Plan...' : 'Analyze Care Plan Document'}
                        </div>
                        <div className="text-xs text-[var(--ok)]/70 mt-1">
                          Upload PDF or Word document
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* AI Chat Composer */}
        <motion.div
          className="glass border-t border-[var(--glass-border)] p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative glass-card rounded-[var(--radius-xl)] shadow-[var(--shadow-glass)] focus-within:shadow-[var(--shadow-focus)] transition-standard">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask CareIQ anything about compliance, operations, or care planning..."
                disabled={isCreating}
                autoFocus
                className="w-full resize-none border-0 bg-transparent px-6 py-4 pr-16 text-[var(--text-primary)] placeholder-[var(--muted)] focus:outline-none text-base leading-6 rounded-[var(--radius-xl)]"
                style={{ minHeight: '64px', maxHeight: '200px' }}
                rows={1}
              />
              <motion.button
                onClick={handleSend}
                disabled={!message.trim() || isCreating}
                className="absolute right-3 bottom-3 w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center transition-standard focus-ring"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  backgroundColor: message.trim() && !isCreating ? 'var(--accent)' : 'var(--muted)',
                  color: message.trim() && !isCreating ? 'var(--accent-contrast)' : 'var(--text-primary)'
                }}
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </motion.button>
            </div>
            <div className="text-center mt-4 space-y-2">
              <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]">
                <span>⌘/Ctrl+K to search</span>
                <span>•</span>
                <span>⌘/Ctrl+Enter to send</span>
                <span>•</span>
                <span>Shift+Enter for newline</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                CareIQ can make mistakes. Verify important compliance information.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
