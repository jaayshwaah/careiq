import { useState, useCallback } from 'react';
import { ValidationError, ValidationErrorHandler } from '@/lib/errorHandler';

export interface UseDataValidationReturn {
  errors: ValidationError[];
  validate: (data: Record<string, any>, rules: ValidationRules) => boolean;
  clearErrors: () => void;
  getFieldError: (field: string) => string | undefined;
  hasErrors: boolean;
}

export interface ValidationRules {
  [key: string]: {
    required?: boolean;
    email?: boolean;
    password?: boolean;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => ValidationError[];
  };
}

export function useDataValidation(): UseDataValidationReturn {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = useCallback((data: Record<string, any>, rules: ValidationRules): boolean => {
    const newErrors: ValidationError[] = [];

    Object.keys(rules).forEach(field => {
      const value = data[field];
      const rule = rules[field];

      // Required validation
      if (rule.required) {
        newErrors.push(...ValidationErrorHandler.validateRequired(value, field));
      }

      // Email validation
      if (rule.email && value) {
        newErrors.push(...ValidationErrorHandler.validateEmail(value));
      }

      // Password validation
      if (rule.password && value) {
        newErrors.push(...ValidationErrorHandler.validatePassword(value));
      }

      // Length validation
      if (rule.minLength || rule.maxLength) {
        if (typeof value === 'string') {
          newErrors.push(...ValidationErrorHandler.validateLength(
            value, 
            field, 
            rule.minLength || 0, 
            rule.maxLength
          ));
        }
      }

      // Custom validation
      if (rule.custom && value) {
        newErrors.push(...rule.custom(value));
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  const hasErrors = errors.length > 0;

  return {
    errors,
    validate,
    clearErrors,
    getFieldError,
    hasErrors
  };
}
