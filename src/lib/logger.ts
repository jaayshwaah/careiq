// Comprehensive logging system for CareIQ
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  userId?: string;
  facilityId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.INFO;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: this.getCurrentUserId(),
      facilityId: this.getCurrentFacilityId(),
      metadata,
      stack: error?.stack
    };
  }

  private getCurrentUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).user?.id : undefined;
    } catch {
      return undefined;
    }
  }

  private getCurrentFacilityId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).user?.facility_id : undefined;
    } catch {
      return undefined;
    }
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send to analytics endpoint
    this.sendToAnalytics(entry);
  }

  private async sendToAnalytics(entry: LogEntry): Promise<void> {
    try {
      await fetch('/api/analytics/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to analytics:', error);
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
      this.addLog(entry);
      console.debug(`[CareIQ DEBUG] ${message}`, metadata);
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
      this.addLog(entry);
      console.info(`[CareIQ INFO] ${message}`, metadata);
    }
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
      this.addLog(entry);
      console.warn(`[CareIQ WARN] ${message}`, metadata);
    }
  }

  error(message: string, context?: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata, error);
      this.addLog(entry);
      console.error(`[CareIQ ERROR] ${message}`, error, metadata);
    }
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const debug = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.debug(message, context, metadata);

export const info = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.info(message, context, metadata);

export const warn = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.warn(message, context, metadata);

export const error = (message: string, context?: string, err?: Error, metadata?: Record<string, any>) => 
  logger.error(message, context, err, metadata);

// React hook for logging
export function useLogger(context?: string) {
  return {
    debug: (message: string, metadata?: Record<string, any>) => 
      logger.debug(message, context, metadata),
    info: (message: string, metadata?: Record<string, any>) => 
      logger.info(message, context, metadata),
    warn: (message: string, metadata?: Record<string, any>) => 
      logger.warn(message, context, metadata),
    error: (message: string, err?: Error, metadata?: Record<string, any>) => 
      logger.error(message, context, err, metadata)
  };
}
