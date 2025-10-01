// Centralized error handling and logging
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  facilityId?: string;
  url?: string;
  userAgent?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Log error to console and store locally
  logError(error: Partial<AppError>): void {
    const fullError: AppError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details,
      timestamp: new Date().toISOString(),
      userId: error.userId,
      facilityId: error.facilityId,
      url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: error.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : '')
    };

    this.errors.push(fullError);
    console.error('CareIQ Error:', fullError);

    // Send to analytics endpoint
    this.sendToAnalytics(fullError);
  }

  // Send error to analytics endpoint
  private async sendToAnalytics(error: AppError): Promise<void> {
    try {
      await fetch('/api/analytics/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error)
      });
    } catch (err) {
      console.error('Failed to send error to analytics:', err);
    }
  }

  // Get recent errors
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errors.slice(-limit);
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
  }
}

// React hook for error handling
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (error: Error | string, context?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorCode = typeof error === 'string' ? 'CUSTOM_ERROR' : error.name || 'UNKNOWN_ERROR';
    
    errorHandler.logError({
      code: errorCode,
      message: errorMessage,
      details: { context, stack: typeof error === 'object' ? error.stack : undefined }
    });
  };

  return { handleError, getRecentErrors: errorHandler.getRecentErrors.bind(errorHandler) };
}

// API error wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      errorHandler.logError({
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown API error',
        details: { context, args: args.length }
      });
      return null;
    }
  };
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ValidationErrorHandler {
  static validateEmail(email: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!emailRegex.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    return errors;
  }

  static validatePassword(password: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push({ 
        field: 'password', 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }
    
    return errors;
  }

  static validateRequired(value: any, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (value === null || value === undefined || value === '') {
      errors.push({ field: fieldName, message: `${fieldName} is required` });
    }
    
    return errors;
  }

  static validateLength(value: string, fieldName: string, min: number, max?: number): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (value.length < min) {
      errors.push({ field: fieldName, message: `${fieldName} must be at least ${min} characters` });
    }
    
    if (max && value.length > max) {
      errors.push({ field: fieldName, message: `${fieldName} must be no more than ${max} characters` });
    }
    
    return errors;
  }
}
