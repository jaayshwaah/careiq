// Comprehensive validation schemas for CareIQ
import { ValidationError } from './errorHandler';

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationError[];
  enum?: any[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Common validation schemas
export const userSchema: ValidationSchema = {
  email: {
    required: true,
    type: 'email',
    maxLength: 255
  },
  full_name: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100
  },
  role: {
    required: true,
    enum: ['admin', 'manager', 'director', 'nurse', 'cna', 'therapist', 'social_worker']
  },
  facility_id: {
    required: true,
    type: 'uuid'
  }
};

export const facilitySchema: ValidationSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 200
  },
  address: {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 500
  },
  city: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100
  },
  state: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 2,
    pattern: /^[A-Z]{2}$/
  },
  zip_code: {
    required: true,
    type: 'string',
    pattern: /^\d{5}(-\d{4})?$/
  },
  phone: {
    required: true,
    type: 'string',
    pattern: /^\(\d{3}\) \d{3}-\d{4}$/
  },
  license_number: {
    required: true,
    type: 'string',
    minLength: 5,
    maxLength: 50
  }
};

export const carePlanSchema: ValidationSchema = {
  resident_id: {
    required: true,
    type: 'uuid'
  },
  title: {
    required: true,
    type: 'string',
    minLength: 5,
    maxLength: 200
  },
  description: {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 2000
  },
  priority: {
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  target_date: {
    required: true,
    type: 'date'
  },
  status: {
    required: true,
    enum: ['draft', 'active', 'completed', 'cancelled']
  }
};

export const taskSchema: ValidationSchema = {
  title: {
    required: true,
    type: 'string',
    minLength: 5,
    maxLength: 200
  },
  description: {
    type: 'string',
    maxLength: 1000
  },
  priority: {
    required: true,
    enum: ['low', 'medium', 'high', 'urgent']
  },
  due_date: {
    type: 'date'
  },
  assigned_to: {
    type: 'uuid'
  },
  status: {
    required: true,
    enum: ['pending', 'in_progress', 'completed', 'cancelled']
  }
};

export const incidentReportSchema: ValidationSchema = {
  resident_id: {
    type: 'uuid'
  },
  incident_type: {
    required: true,
    enum: ['fall', 'medication_error', 'injury', 'behavioral', 'other']
  },
  description: {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 2000
  },
  severity: {
    required: true,
    enum: ['minor', 'moderate', 'major', 'critical']
  },
  occurred_at: {
    required: true,
    type: 'date'
  },
  reported_by: {
    required: true,
    type: 'uuid'
  }
};

// Validation function
export function validateData(data: Record<string, any>, schema: ValidationSchema): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.keys(schema).forEach(field => {
    const value = data[field];
    const rule = schema[field];

    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        value
      });
      return; // Skip other validations if required field is missing
    }

    // Skip validation if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return;
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(value, field, rule.type);
      if (typeError) {
        errors.push(typeError);
        return; // Skip other validations if type is wrong
      }
    }

    // String length validation
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.minLength} characters`,
          value
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `${field} must be no more than ${rule.maxLength} characters`,
          value
        });
      }
    }

    // Number range validation
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`,
          value
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          message: `${field} must be no more than ${rule.max}`,
          value
        });
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        field,
        message: `${field} format is invalid`,
        value
      });
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${rule.enum.join(', ')}`,
        value
      });
    }

    // Custom validation
    if (rule.custom) {
      errors.push(...rule.custom(value));
    }
  });

  return errors;
}

function validateType(value: any, field: string, type: string): ValidationError | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: `${field} must be a string`, value };
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: `${field} must be a number`, value };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean`, value };
      }
      break;
    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { field, message: `${field} must be a valid email address`, value };
      }
      break;
    case 'url':
      if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
        return { field, message: `${field} must be a valid URL`, value };
      }
      break;
    case 'date':
      if (!(value instanceof Date) && !/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return { field, message: `${field} must be a valid date`, value };
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return { field, message: `${field} must be a valid UUID`, value };
      }
      break;
  }
  return null;
}

// Sanitization functions
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function sanitizeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
