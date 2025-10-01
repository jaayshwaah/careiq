"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  ClipboardList, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Activity,
  TrendingUp,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Round {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  unit: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string;
  dueTime: Date;
  completedAt?: Date;
  notes?: string;
  issues?: string[];
}

interface Incident {
  id: string;
  residentId: string;
  residentName: string;
  type: 'fall' | 'medication' | 'behavioral' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  reportedBy: string;
  reportedAt: Date;
  description: string;
  actions?: string[];
}

interface Staffing {
  shift: 'day' | 'evening' | 'night';
  rnCount: number;
  lpnCount: number;
  cnaCount: number;
  totalResidents: number;
  ppd: number;
  compliance: 'compliant' | 'warning' | 'deficient';
}

const EnhancedDailyOpsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'rounds' | 'incidents' | 'staffing' | 'census'>('rounds');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [staffing, setStaffing] = useState<Staffing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock data
  useEffect(() => {
    setRounds([
      {
        id: '1',
        residentId: 'R001',
        residentName: 'John Smith',
        room: '101A',
        unit: 'North Wing',
        status: 'completed',
        assignedTo: 'Sarah Johnson',
        dueTime: new Date('2024-01-15T08:00:00'),
        completedAt: new Date('2024-01-15T08:15:00'),
        notes: 'Resident in good spirits, no concerns',
        issues: []
      },
      {
        id: '2',
        residentId: 'R002',
        residentName: 'Mary Davis',
        room: '102B',
        unit: 'North Wing',
        status: 'in_progress',
        assignedTo: 'Mike Wilson',
        dueTime: new Date('2024-01-15T08:30:00'),
        issues: ['Medication concern']
      },
      {
        id: '3',
        residentId: 'R003',
        residentName: 'Robert Brown',
        room: '201A',
        unit: 'South Wing',
        status: 'overdue',
        assignedTo: 'Sarah Johnson',
        dueTime: new Date('2024-01-15T07:45:00'),
        issues: ['Family request']
      }
    ]);

    setIncidents([
      {
        id: 'I001',
        residentId: 'R004',
        residentName: 'Alice Johnson',
        type: 'fall',
        severity: 'medium',
        status: 'investigating',
        reportedBy: 'Nurse Smith',
        reportedAt: new Date('2024-01-15T10:30:00'),
        description: 'Resident fell in bathroom, no visible injuries',
        actions: ['Incident report filed', 'Family notified', 'MD contacted']
      },
      {
        id: 'I002',
        residentId: 'R005',
        residentName: 'David Wilson',
        type: 'medication',
        severity: 'high',
        status: 'open',
        reportedBy: 'Pharmacist',
        reportedAt: new Date('2024-01-15T11:00:00'),
        description: 'Medication error - wrong dosage administered',
        actions: ['Immediate assessment', 'Correct medication given']
      }
    ]);

    setStaffing([
      {
        shift: 'day',
        rnCount: 3,
        lpnCount: 2,
        cnaCount: 8,
        totalResidents: 120,
        ppd: 1.125,
        compliance: 'compliant'
      },
      {
        shift: 'evening',
        rnCount: 2,
        lpnCount: 3,
        cnaCount: 6,
        totalResidents: 120,
        ppd: 1.083,
        compliance: 'compliant'
      },
      {
        shift: 'night',
        rnCount: 1,
        lpnCount: 2,
        cnaCount: 4,
        totalResidents: 120,
        ppd: 1.0,
        compliance: 'warning'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'compliant':
      case 'resolved':
        return 'text-[var(--ok)]';
      case 'in_progress':
      case 'investigating':
        return 'text-[var(--info)]';
      case 'warning':
      case 'overdue':
        return 'text-[var(--warn)]';
      case 'open':
      case 'deficient':
      case 'critical':
        return 'text-[var(--err)]';
      default:
        return 'text-[var(--muted)]';
    }
  };

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

  const tabs = [
    { id: 'rounds', label: 'Rounds', icon: ClipboardList, count: rounds.length },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, count: incidents.length },
    { id: 'staffing', label: 'Staffing', icon: Users, count: staffing.length },
    { id: 'census', label: 'Census', icon: Activity, count: 120 }
  ];

  const filteredRounds = rounds.filter(round => {
    const matchesSearch = round.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         round.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || round.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || incident.status === filterStatus;
    return matchesSearch && matchesFilter;
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
              Daily Operations
            </h1>
            <p className="text-[var(--muted)] mt-1">
              Manage rounds, incidents, staffing, and census
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
              {tab.count > 0 && (
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
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'rounds' && (
              <motion.div
                key="rounds"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRounds.map((round) => (
                    <Card
                      key={round.id}
                      variant="glass"
                      interactive
                      className="hover:shadow-[var(--shadow-popover)]"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-[var(--info)]" />
                            <span className="font-semibold">{round.residentName}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-full font-medium",
                            round.status === 'completed' && "bg-[var(--ok)]/20 text-[var(--ok)]",
                            round.status === 'in_progress' && "bg-[var(--info)]/20 text-[var(--info)]",
                            round.status === 'overdue' && "bg-[var(--warn)]/20 text-[var(--warn)]",
                            round.status === 'pending' && "bg-[var(--muted)]/20 text-[var(--muted)]"
                          )}>
                            {round.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            Room {round.room}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {round.dueTime.toLocaleTimeString()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Assigned to:</span> {round.assignedTo}
                          </div>
                          {round.notes && (
                            <div className="text-sm text-[var(--muted)]">
                              {round.notes}
                            </div>
                          )}
                          {round.issues && round.issues.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-[var(--warn)]">Issues:</div>
                              {round.issues.map((issue, index) => (
                                <div key={index} className="text-sm text-[var(--warn)]">
                                  • {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'incidents' && (
              <motion.div
                key="incidents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIncidents.map((incident) => (
                    <Card
                      key={incident.id}
                      variant="glass"
                      interactive
                      className="hover:shadow-[var(--shadow-popover)]"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-[var(--err)]" />
                            <span className="font-semibold">{incident.residentName}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-full font-medium",
                            getSeverityColor(incident.severity)
                          )}>
                            {incident.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                          <div className="flex items-center gap-1">
                            <FileText size={14} />
                            {incident.type}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {incident.reportedAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="text-sm">
                            <span className="font-medium">Status:</span> 
                            <span className={cn("ml-2", getStatusColor(incident.status))}>
                              {incident.status}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Reported by:</span> {incident.reportedBy}
                          </div>
                          <div className="text-sm text-[var(--muted)]">
                            {incident.description}
                          </div>
                          {incident.actions && incident.actions.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Actions taken:</div>
                              {incident.actions.map((action, index) => (
                                <div key={index} className="text-sm text-[var(--muted)]">
                                  • {action}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'staffing' && (
              <motion.div
                key="staffing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {staffing.map((shift) => (
                    <Card
                      key={shift.shift}
                      variant="glass"
                      className="hover:shadow-[var(--shadow-popover)]"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold capitalize">
                            {shift.shift} Shift
                          </h3>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded-full font-medium",
                            shift.compliance === 'compliant' && "bg-[var(--ok)]/20 text-[var(--ok)]",
                            shift.compliance === 'warning' && "bg-[var(--warn)]/20 text-[var(--warn)]",
                            shift.compliance === 'deficient' && "bg-[var(--err)]/20 text-[var(--err)]"
                          )}>
                            {shift.compliance}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-[var(--muted)]">RN</div>
                              <div className="text-xl font-bold">{shift.rnCount}</div>
                            </div>
                            <div>
                              <div className="font-medium text-[var(--muted)]">LPN</div>
                              <div className="text-xl font-bold">{shift.lpnCount}</div>
                            </div>
                            <div>
                              <div className="font-medium text-[var(--muted)]">CNA</div>
                              <div className="text-xl font-bold">{shift.cnaCount}</div>
                            </div>
                            <div>
                              <div className="font-medium text-[var(--muted)]">PPD</div>
                              <div className="text-xl font-bold">{shift.ppd}</div>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-[var(--border)]">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[var(--muted)]">Total Residents</span>
                              <span className="font-semibold">{shift.totalResidents}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'census' && (
              <motion.div
                key="census"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--info)] mb-2">120</div>
                      <div className="text-sm text-[var(--muted)]">Total Beds</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--ok)] mb-2">115</div>
                      <div className="text-sm text-[var(--muted)]">Occupied</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--warn)] mb-2">5</div>
                      <div className="text-sm text-[var(--muted)]">Available</div>
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="text-center">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-[var(--accent)] mb-2">95.8%</div>
                      <div className="text-sm text-[var(--muted)]">Occupancy Rate</div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedDailyOpsPage;
