"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X, 
  Bell,
  Info,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface ComplianceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  regulation?: string;
  dueDate?: string;
  actionUrl?: string;
  dismissed?: boolean;
  created: string;
}

interface ComplianceAlertsProps {
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

export default function ComplianceAlerts({ 
  className = "",
  limit = 5,
  showHeader = true 
}: ComplianceAlertsProps) {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock alerts data - in production this would come from API
  useEffect(() => {
    const mockAlerts: ComplianceAlert[] = [
      {
        id: "alert-1",
        type: "critical",
        title: "F-514 Staffing Deficiency Risk",
        message: "Current RN coverage is below minimum requirements for 3 consecutive days. Immediate action required.",
        regulation: "F-514",
        dueDate: "2024-03-01",
        actionUrl: "/ppd-calculator",
        created: "2024-02-28T10:00:00Z"
      },
      {
        id: "alert-2", 
        type: "warning",
        title: "Infection Control Policy Update Due",
        message: "Annual review of infection prevention policies is overdue. Review required by end of month.",
        regulation: "F-686",
        dueDate: "2024-03-15",
        actionUrl: "/cms-guidance",
        created: "2024-02-25T14:30:00Z"
      },
      {
        id: "alert-3",
        type: "info",
        title: "New CMS Guidance Available",
        message: "Updated guidance on dietary services and nutritional care planning has been published.",
        regulation: "F-812",
        actionUrl: "/cms-guidance",
        created: "2024-02-24T09:15:00Z"
      },
      {
        id: "alert-4",
        type: "warning",
        title: "QAPI Meeting Overdue",
        message: "Monthly QAPI committee meeting has not been scheduled. Required quarterly reporting deadline approaching.",
        regulation: "F-725",
        dueDate: "2024-03-10",
        actionUrl: "/survey-prep",
        created: "2024-02-22T16:45:00Z"
      },
      {
        id: "alert-5",
        type: "success",
        title: "Staff Training Completion",
        message: "All nursing staff have completed mandatory infection control training ahead of schedule.",
        regulation: "F-686",
        created: "2024-02-20T11:20:00Z"
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setAlerts(mockAlerts.slice(0, limit));
      setLoading(false);
    }, 500);
  }, [limit]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'info':
        return <Info className="text-blue-500" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} />
            <h2 className="text-lg font-semibold">Compliance Alerts</h2>
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} />
            <h2 className="text-lg font-semibold">Compliance Alerts</h2>
          </div>
        )}
        <div className="text-center py-8 text-gray-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
          <p className="font-medium">All clear!</p>
          <p className="text-sm">No compliance alerts at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={18} />
            <h2 className="text-lg font-semibold">Compliance Alerts</h2>
          </div>
          <span className="text-sm text-gray-500">{alerts.length} active</span>
        </div>
      )}
      
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {alert.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {alert.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {alert.regulation && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          {alert.regulation}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(alert.created)}
                      </span>
                      
                      {alert.dueDate && (
                        <span className={`flex items-center gap-1 font-medium ${
                          getDaysUntilDue(alert.dueDate).includes('Overdue') 
                            ? 'text-red-600' 
                            : getDaysUntilDue(alert.dueDate).includes('today') || getDaysUntilDue(alert.dueDate).includes('tomorrow')
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}>
                          <AlertTriangle size={12} />
                          {getDaysUntilDue(alert.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.actionUrl && (
                      <a
                        href={alert.actionUrl}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Take action"
                      >
                        <ChevronRight size={16} />
                      </a>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors"
                      title="Dismiss alert"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {alerts.length >= limit && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all alerts
          </button>
        </div>
      )}
    </div>
  );
}