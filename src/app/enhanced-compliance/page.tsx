"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  BookOpen,
  ExternalLink,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FTag {
  id: string;
  code: string;
  title: string;
  category: 'quality' | 'safety' | 'rights' | 'administration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'at_risk' | 'deficient' | 'under_review';
  lastSurvey: Date;
  nextSurvey?: Date;
  description: string;
  requirements: string[];
  recommendations: string[];
  score?: number;
}

interface Survey {
  id: string;
  type: 'standard' | 'complaint' | 'revisit' | 'focused';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  surveyor: string;
  startDate: Date;
  endDate?: Date;
  findings: SurveyFinding[];
  overallScore: number;
  deficiencies: number;
}

interface SurveyFinding {
  id: string;
  fTag: string;
  severity: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  scope: 'isolated' | 'pattern' | 'widespread';
  level: 'immediate_jeopardy' | 'actual_harm' | 'potential_harm' | 'no_harm';
  description: string;
  citation: string;
  planOfCorrection?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

interface ComplianceAlert {
  id: string;
  type: 'f_tag' | 'survey' | 'policy' | 'training';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'resolved';
  dueDate?: Date;
  fTag?: string;
  actionRequired: boolean;
}

const EnhancedCompliancePage: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'f_tags' | 'surveys' | 'alerts' | 'policies'>('overview');
  const [fTags, setFTags] = useState<FTag[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Mock data
  useEffect(() => {
    setFTags([
      {
        id: '1',
        code: 'F684',
        title: 'Quality of Care',
        category: 'quality',
        severity: 'high',
        status: 'at_risk',
        lastSurvey: new Date('2024-01-01'),
        nextSurvey: new Date('2024-07-01'),
        description: 'Ensure residents receive care and services to attain or maintain their highest practicable physical, mental, and psychosocial well-being.',
        requirements: [
          'Develop comprehensive care plans',
          'Implement evidence-based interventions',
          'Monitor resident outcomes',
          'Update care plans as needed'
        ],
        recommendations: [
          'Review current care planning process',
          'Implement quality improvement measures',
          'Provide staff training on care planning'
        ],
        score: 85
      },
      {
        id: '2',
        code: 'F686',
        title: 'Treatment and Services',
        category: 'quality',
        severity: 'medium',
        status: 'compliant',
        lastSurvey: new Date('2024-01-15'),
        description: 'Ensure residents receive treatment and services in accordance with professional standards of practice.',
        requirements: [
          'Follow physician orders',
          'Implement treatment protocols',
          'Monitor treatment effectiveness'
        ],
        recommendations: [],
        score: 92
      },
      {
        id: '3',
        code: 'F725',
        title: 'Sufficient Nursing Staff',
        category: 'safety',
        severity: 'critical',
        status: 'deficient',
        lastSurvey: new Date('2024-01-10'),
        description: 'Maintain sufficient nursing staff to meet resident needs.',
        requirements: [
          'Meet minimum staffing ratios',
          'Ensure qualified staff coverage',
          'Maintain adequate supervision'
        ],
        recommendations: [
          'Increase nursing staff levels',
          'Implement staff scheduling improvements',
          'Provide additional training'
        ],
        score: 65
      }
    ]);

    setSurveys([
      {
        id: 'S001',
        type: 'standard',
        status: 'completed',
        surveyor: 'CMS Survey Team',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        findings: [
          {
            id: 'F1',
            fTag: 'F725',
            severity: 'D',
            scope: 'pattern',
            level: 'actual_harm',
            description: 'Insufficient nursing staff during evening shift',
            citation: '42 CFR 483.35(a)',
            status: 'open'
          }
        ],
        overallScore: 78,
        deficiencies: 1
      }
    ]);

    setAlerts([
      {
        id: 'A001',
        type: 'f_tag',
        title: 'F725 Deficiency - Staffing',
        description: 'Nursing staff levels below required minimum',
        severity: 'critical',
        status: 'new',
        dueDate: new Date('2024-01-20'),
        fTag: 'F725',
        actionRequired: true
      },
      {
        id: 'A002',
        type: 'survey',
        title: 'Survey Scheduled',
        description: 'Standard survey scheduled for next month',
        severity: 'medium',
        status: 'acknowledged',
        dueDate: new Date('2024-02-01'),
        actionRequired: false
      }
    ]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-[var(--ok)]/20 text-[var(--ok)]';
      case 'medium':
        return 'bg-[var(--warn)]/20 text-[var(--warn)]';
      case 'high':
        return 'bg-[var(--err)]/20 text-[var(--err)]';
      case 'critical':
        return 'bg-[var(--err)] text-white';
      default:
        return 'bg-[var(--muted)]/20 text-[var(--muted)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'resolved':
        return 'text-[var(--ok)]';
      case 'at_risk':
      case 'acknowledged':
        return 'text-[var(--warn)]';
      case 'deficient':
      case 'open':
        return 'text-[var(--err)]';
      case 'under_review':
      case 'in_progress':
        return 'text-[var(--info)]';
      default:
        return 'text-[var(--muted)]';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quality':
        return <Shield size={16} className="text-[var(--info)]" />;
      case 'safety':
        return <AlertTriangle size={16} className="text-[var(--err)]" />;
      case 'rights':
        return <Users size={16} className="text-[var(--ok)]" />;
      case 'administration':
        return <FileText size={16} className="text-[var(--warn)]" />;
      default:
        return <Shield size={16} className="text-[var(--muted)]" />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'f_tags', label: 'F-Tags', icon: FileText, count: fTags.length },
    { id: 'surveys', label: 'Surveys', icon: Calendar, count: surveys.length },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: alerts.length },
    { id: 'policies', label: 'Policies', icon: BookOpen }
  ];

  const filteredFTags = fTags.filter(fTag => {
    const matchesSearch = fTag.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fTag.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || fTag.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Compliance & Surveys
            </h1>
            <p className="text-[var(--muted)] mt-1">
              Monitor F-Tags, surveys, and compliance status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={16} />}
              onClick={() => setLoading(true)}
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Plus size={16} />}
              onClick={() => {/* Handle new item */}}
            >
              New
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex space-x-1 glass rounded-[var(--radius-lg)] p-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-standard",
                activeTab === tab.id
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-soft"
                  : "text-[var(--text-primary)] hover:bg-[var(--muted)]"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex-1">
            <Input
              placeholder="Search F-Tags, surveys, or alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          >
            <option value="all">All Categories</option>
            <option value="quality">Quality</option>
            <option value="safety">Safety</option>
            <option value="rights">Rights</option>
            <option value="administration">Administration</option>
          </select>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--ok)] mb-2">
                        {fTags.filter(f => f.status === 'compliant').length}
                      </div>
                      <div className="text-sm text-[var(--muted)]">Compliant F-Tags</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--warn)] mb-2">
                        {fTags.filter(f => f.status === 'at_risk').length}
                      </div>
                      <div className="text-sm text-[var(--muted)]">At Risk</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--err)] mb-2">
                        {fTags.filter(f => f.status === 'deficient').length}
                      </div>
                      <div className="text-sm text-[var(--muted)]">Deficient</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--info)] mb-2">
                        {alerts.filter(a => a.status === 'new').length}
                      </div>
                      <div className="text-sm text-[var(--muted)]">New Alerts</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest compliance updates and alerts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {alerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--muted)]/50">
                          <div className={cn(
                            "p-2 rounded-full",
                            getSeverityColor(alert.severity)
                          )}>
                            <AlertTriangle size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-[var(--muted)]">{alert.description}</div>
                          </div>
                          <div className="text-sm text-[var(--muted)]">
                            {alert.dueDate?.toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'f_tags' && (
              <motion.div
                key="f_tags"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredFTags.map((fTag) => (
                    <Card
                      key={fTag.id}
                      variant="glass"
                      interactive
                      className="hover:shadow-[var(--shadow-popover)]"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(fTag.category)}
                            <div>
                              <CardTitle className="text-lg">{fTag.code}</CardTitle>
                              <CardDescription>{fTag.title}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 text-xs rounded-full font-medium",
                              getSeverityColor(fTag.severity)
                            )}>
                              {fTag.severity}
                            </span>
                            <span className={cn(
                              "px-2 py-1 text-xs rounded-full font-medium",
                              fTag.status === 'compliant' && "bg-[var(--ok)]/20 text-[var(--ok)]",
                              fTag.status === 'at_risk' && "bg-[var(--warn)]/20 text-[var(--warn)]",
                              fTag.status === 'deficient' && "bg-[var(--err)]/20 text-[var(--err)]",
                              fTag.status === 'under_review' && "bg-[var(--info)]/20 text-[var(--info)]"
                            )}>
                              {fTag.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="text-sm text-[var(--muted)]">
                            {fTag.description}
                          </div>
                          {fTag.score && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Score:</span>
                              <div className="flex-1 bg-[var(--muted)] rounded-full h-2">
                                <div 
                                  className={cn(
                                    "h-2 rounded-full",
                                    fTag.score >= 90 && "bg-[var(--ok)]",
                                    fTag.score >= 70 && fTag.score < 90 && "bg-[var(--warn)]",
                                    fTag.score < 70 && "bg-[var(--err)]"
                                  )}
                                  style={{ width: `${fTag.score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{fTag.score}%</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              Last: {fTag.lastSurvey.toLocaleDateString()}
                            </div>
                            {fTag.nextSurvey && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                Next: {fTag.nextSurvey.toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" leftIcon={<Eye size={14} />}>
                              View Details
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon={<Edit size={14} />}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <Card
                      key={alert.id}
                      variant="glass"
                      interactive
                      className="hover:shadow-[var(--shadow-popover)]"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            getSeverityColor(alert.severity)
                          )}>
                            <AlertTriangle size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{alert.title}</h3>
                              {alert.fTag && (
                                <span className="px-2 py-1 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded">
                                  {alert.fTag}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--muted)] mb-2">
                              {alert.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full font-medium",
                                alert.status === 'new' && "bg-[var(--info)]/20 text-[var(--info)]",
                                alert.status === 'acknowledged' && "bg-[var(--warn)]/20 text-[var(--warn)]",
                                alert.status === 'resolved' && "bg-[var(--ok)]/20 text-[var(--ok)]"
                              )}>
                                {alert.status}
                              </span>
                              {alert.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock size={14} />
                                  Due: {alert.dueDate.toLocaleDateString()}
                                </span>
                              )}
                              {alert.actionRequired && (
                                <span className="text-[var(--err)] font-medium">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              Acknowledge
                            </Button>
                            <Button variant="ghost" size="sm">
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedCompliancePage;
