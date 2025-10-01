"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  className?: string;
}

type ConnectionStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface IntegrationStatus {
  name: string;
  status: ConnectionStatus;
  lastSync?: Date;
  error?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { name: 'EHR (PCC)', status: 'connected', lastSync: new Date() },
    { name: 'Calendar', status: 'connected', lastSync: new Date() },
    { name: 'Billing', status: 'offline' }
  ]);

  // Simulate connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastSync(now);
      
      // Simulate occasional status changes
      if (Math.random() < 0.1) {
        const statuses: ConnectionStatus[] = ['connected', 'syncing', 'offline'];
        setConnectionStatus(statuses[Math.floor(Math.random() * statuses.length)]);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={14} className="status-ok" />;
      case 'syncing':
        return <RefreshCw size={14} className="status-info animate-spin" />;
      case 'offline':
        return <WifiOff size={14} className="status-warn" />;
      case 'error':
        return <XCircle size={14} className="status-error" />;
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'status-ok';
      case 'syncing':
        return 'status-info';
      case 'offline':
        return 'status-warn';
      case 'error':
        return 'status-error';
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleRefresh = () => {
    setConnectionStatus('syncing');
    setLastSync(new Date());
    
    // Simulate refresh
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  };

  return (
    <motion.div
      className={cn(
        "flex items-center gap-4 px-4 py-2 text-sm glass border-b border-[var(--glass-border)]",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {getStatusIcon(connectionStatus)}
        <span className={cn("font-medium", getStatusColor(connectionStatus))}>
          {getStatusText(connectionStatus)}
        </span>
      </div>

      {/* Last Sync */}
      <div className="flex items-center gap-2 text-muted">
        <Clock size={14} />
        <span>Last synced {formatLastSync(lastSync)}</span>
        <motion.button
          onClick={handleRefresh}
          className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--muted)] transition-standard focus-ring"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={connectionStatus === 'syncing'}
        >
          <RefreshCw 
            size={14} 
            className={cn(
              "transition-standard",
              connectionStatus === 'syncing' && "animate-spin"
            )} 
          />
        </motion.button>
      </div>

      {/* Integration Status */}
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-muted" />
        <div className="flex items-center gap-1">
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.name}
              className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--muted)]/50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {getStatusIcon(integration.status)}
              <span className="text-xs font-medium">{integration.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Real-time Indicator */}
      <AnimatePresence>
        {connectionStatus === 'connected' && (
          <motion.div
            className="flex items-center gap-1 status-ok"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-2 h-2 bg-[var(--ok)] rounded-full animate-pulse" />
            <span className="text-xs font-medium">Live</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Indicator */}
      <AnimatePresence>
        {connectionStatus === 'offline' && (
          <motion.div
            className="flex items-center gap-1 status-warn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <WifiOff size={14} />
            <span className="text-xs font-medium">Offline Mode</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StatusBar;
