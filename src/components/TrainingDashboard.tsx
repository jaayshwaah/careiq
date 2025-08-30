"use client";

import { useState, useEffect } from "react";
import { 
  Award, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Target, 
  CheckCircle,
  Star,
  Calendar,
  BarChart3,
  Download,
  Share2,
  RefreshCw,
  Trophy,
  Users,
  Zap
} from "lucide-react";

interface TrainingStats {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  timeSpent: number;
  certificatesEarned: number;
  currentStreak: number;
  bestCategory: string;
  improvementTrend: number;
}

interface RecentActivity {
  id: string;
  sessionTitle: string;
  score: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
}

interface Certificate {
  id: string;
  sessionTitle: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string;
  score: number;
}

interface TrainingDashboardProps {
  userId?: string;
  className?: string;
}

export default function TrainingDashboard({ userId, className = "" }: TrainingDashboardProps) {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in production this would come from API
  useEffect(() => {
    const mockStats: TrainingStats = {
      totalSessions: 6,
      completedSessions: 4,
      averageScore: 87,
      timeSpent: 3420, // seconds
      certificatesEarned: 3,
      currentStreak: 4,
      bestCategory: "Infection Control",
      improvementTrend: 12 // percentage improvement
    };

    const mockActivity: RecentActivity[] = [
      {
        id: "1",
        sessionTitle: "Nursing Staff Compliance (F-514)",
        score: 92,
        passed: true,
        completedAt: "2024-02-28T14:30:00Z",
        timeSpent: 1080
      },
      {
        id: "2", 
        sessionTitle: "Infection Prevention & Control (F-686)",
        score: 88,
        passed: true,
        completedAt: "2024-02-27T10:15:00Z",
        timeSpent: 1260
      },
      {
        id: "3",
        sessionTitle: "Quality Assurance & Performance Improvement (F-725)",
        score: 74,
        passed: false,
        completedAt: "2024-02-26T16:45:00Z",
        timeSpent: 900
      },
      {
        id: "4",
        sessionTitle: "Resident Rights and Dignity (F-550-580)",
        score: 91,
        passed: true,
        completedAt: "2024-02-25T11:20:00Z",
        timeSpent: 1440
      }
    ];

    const mockCertificates: Certificate[] = [
      {
        id: "cert-1",
        sessionTitle: "Nursing Staff Compliance (F-514)",
        certificateNumber: "CERT-2024-0228-1234",
        issuedAt: "2024-02-28T14:30:00Z",
        expiresAt: "2025-02-28T14:30:00Z", 
        score: 92
      },
      {
        id: "cert-2",
        sessionTitle: "Infection Prevention & Control (F-686)",
        certificateNumber: "CERT-2024-0227-1235",
        issuedAt: "2024-02-27T10:15:00Z",
        expiresAt: "2025-02-27T10:15:00Z",
        score: 88
      },
      {
        id: "cert-3",
        sessionTitle: "Resident Rights and Dignity (F-550-580)",
        certificateNumber: "CERT-2024-0225-1236",
        issuedAt: "2024-02-25T11:20:00Z",
        expiresAt: "2025-02-25T11:20:00Z",
        score: 91
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setStats(mockStats);
      setRecentActivity(mockActivity);
      setCertificates(mockCertificates);
      setLoading(false);
    }, 500);
  }, [userId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getScoreColor = (score: number, passed: boolean) => {
    if (!passed) return 'text-red-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-lg h-64"></div>
            <div className="bg-gray-100 rounded-lg h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.completedSessions}</div>
              <div className="text-sm text-gray-600">Sessions Completed</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.completedSessions} of {stats.totalSessions} total
              </div>
            </div>
            <BookOpen className="text-blue-500" size={24} />
          </div>
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(stats.completedSessions / stats.totalSessions) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
              <div className="text-sm text-gray-600">Average Score</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                +{stats.improvementTrend}% this month
              </div>
            </div>
            <Target className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.certificatesEarned}</div>
              <div className="text-sm text-gray-600">Certificates</div>
              <div className="text-xs text-gray-500 mt-1">
                Earned this year
              </div>
            </div>
            <Award className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{formatTime(stats.timeSpent)}</div>
              <div className="text-sm text-gray-600">Time Invested</div>
              <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <Zap size={12} />
                {stats.currentStreak} day streak
              </div>
            </div>
            <Clock className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Training Activity</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="p-4">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      activity.passed ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {activity.passed ? (
                        <CheckCircle className="text-green-600" size={16} />
                      ) : (
                        <Target className="text-red-600" size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {activity.sessionTitle}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className={`font-medium ${getScoreColor(activity.score, activity.passed)}`}>
                          {activity.score}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(activity.timeSpent)}
                        </span>
                        <span>{formatDate(activity.completedAt)}</span>
                      </div>
                      {activity.passed && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={12} className="text-yellow-500" />
                          <span className="text-xs text-yellow-600">Certificate Earned</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen size={40} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No training activity yet</p>
                <p className="text-sm">Complete your first training session to see your progress here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Certificates */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Training Certificates</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="p-4">
            {certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div key={cert.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                        <Award className="text-yellow-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {cert.sessionTitle}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Certificate #{cert.certificateNumber}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            Issued: {formatDate(cert.issuedAt)}
                          </span>
                          <span className="font-medium text-green-600">
                            Score: {cert.score}%
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                            <Download size={10} />
                            Download
                          </button>
                          <button className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                            <Share2 size={10} />
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy size={40} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No certificates yet</p>
                <p className="text-sm">Pass training sessions to earn certificates and showcase your expertise.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Performance Insights</h3>
          <button className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md text-sm transition-colors">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h4 className="font-semibold text-green-900 mb-1">Strongest Area</h4>
            <p className="text-green-700 font-medium">{stats.bestCategory}</p>
            <p className="text-green-600 text-sm mt-1">Consistently high scores</p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="text-blue-600" size={24} />
            </div>
            <h4 className="font-semibold text-blue-900 mb-1">Peer Ranking</h4>
            <p className="text-blue-700 font-medium">Top 15%</p>
            <p className="text-blue-600 text-sm mt-1">Among facility staff</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="text-purple-600" size={24} />
            </div>
            <h4 className="font-semibold text-purple-900 mb-1">Improvement Rate</h4>
            <p className="text-purple-700 font-medium">+{stats.improvementTrend}%</p>
            <p className="text-purple-600 text-sm mt-1">Score improvement</p>
          </div>
        </div>
      </div>
    </div>
  );
}