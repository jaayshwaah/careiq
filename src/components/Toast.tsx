/* 
   FILE: src/components/Toast.tsx
   Replace entire file with this enhanced version
*/

"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastProps = {
  open: boolean;
  label: string;
  type?: ToastType;
  description?: string;
  onClick?: () => void;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  className?: string;
};

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: {
    bg: "from-[var(--accent-green)]/20 to-emerald-500/20",
    border: "border-[var(--accent-green)]/30",
    icon: "text-[var(--accent-green)]",
    text: "text-[var(--text-primary)]",
  },
  error: {
    bg: "from-[var(--accent-red)]/20 to-red-500/20",
    border: "border-[var(--accent-red)]/30",
    icon: "text-[var(--accent-red)]",
    text: "text-[var(--text-primary)]",
  },
  warning: {
    bg: "from-[var(--accent-orange)]/20 to-orange-500/20",
    border: "border-[var(--accent-orange)]/30",
    icon: "text-[var(--accent-orange)]",
    text: "text-[var(--text-primary)]",
  },
  info: {
    bg: "from-[var(--accent-blue)]/20 to-blue-500/20",
    border: "border-[var(--accent-blue)]/30",
    icon: "text-[var(--accent-blue)]",
    text: "text-[var(--text-primary)]",
  },
};

const positionClasses = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export default function Toast({
  open,
  label,
  type = "info",
  description,
  onClick,
  onClose,
  autoClose = true,
  duration = 5000,
  position = "bottom-center",
  className = "",
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);

  const Icon = toastIcons[type];
  const colors = toastColors[type];

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open && autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        pointer-events-none fixed z-[100] flex justify-center transition-all duration-300 ease-out
        ${positionClasses[position]}
        ${isAnimating 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-2 scale-95"
        }
      `}
      aria-hidden={!open}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          pointer-events-auto group relative max-w-sm overflow-hidden rounded-2xl
          glass-heavy border backdrop-blur-xl cursor-pointer
          transition-all duration-300 hover:scale-105 active:scale-95
          ${colors.border} ${className}
        `}
        onClick={handleClick}
      >
        {/* Gradient background overlay */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r opacity-50 ${colors.bg}`}
        />
        
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                       transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] 
                       transition-transform duration-700 ease-out"
          />
        </div>

        <div className="relative z-10 flex items-start gap-3 p-4">
          {/* Icon */}
          <div className={`flex-shrink-0 ${colors.icon}`}>
            <Icon size={20} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm leading-5 ${colors.text}`}>
              {label}
            </div>
            {description && (
              <div className="text-xs text-[var(--text-secondary)] mt-1 leading-4">
                {description}
              </div>
            )}
          </div>

          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="flex-shrink-0 rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all duration-200"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Progress bar for auto-close */}
        {autoClose && duration > 0 && open && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
            <div
              className={`h-full bg-gradient-to-r ${colors.bg} opacity-60`}
              style={{
                animation: `toast-progress ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Toast Manager Hook for programmatic toasts
type ToastOptions = Omit<ToastProps, 'open' | 'onClose'> & {
  id?: string;
};

type ToastItem = ToastOptions & {
  id: string;
  open: boolean;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (options: ToastOptions) => {
    const id = options.id || `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastItem = {
      ...options,
      id,
      open: true,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration + animation time
    const duration = options.autoClose !== false ? (options.duration || 5000) : 0;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration + 300);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const removeAllToasts = () => {
    setToasts((prev) => prev.map((t) => ({ ...t, open: false })));
    setTimeout(() => {
      setToasts([]);
    }, 300);
  };

  // Convenience methods
  const toast = {
    success: (label: string, options?: Omit<ToastOptions, 'type' | 'label'>) =>
      addToast({ ...options, label, type: 'success' }),
    error: (label: string, options?: Omit<ToastOptions, 'type' | 'label'>) =>
      addToast({ ...options, label, type: 'error' }),
    warning: (label: string, options?: Omit<ToastOptions, 'type' | 'label'>) =>
      addToast({ ...options, label, type: 'warning' }),
    info: (label: string, options?: Omit<ToastOptions, 'type' | 'label'>) =>
      addToast({ ...options, label, type: 'info' }),
  };

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    toast,
  };
}

// Toast Container Component
export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </>
  );
}

// Global Toast Provider (optional)
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}