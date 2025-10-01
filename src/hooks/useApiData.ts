import { useState, useEffect, useCallback } from 'react';
import { useErrorHandler } from '@/lib/errorHandler';

export interface UseApiDataOptions {
  immediate?: boolean;
  retryOnError?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export interface UseApiDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export function useApiData<T>(
  endpoint: string,
  options: UseApiDataOptions = {}
): UseApiDataReturn<T> {
  const {
    immediate = true,
    retryOnError = false,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { handleError } = useErrorHandler();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data || result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      handleError(err as Error, `useApiData:${endpoint}`);

      if (retryOnError && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, retryOnError, retryDelay, maxRetries, retryCount, handleError]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate
  };
}

// Hook for POST/PUT/DELETE operations
export function useApiMutation<T, R = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const mutate = useCallback(async (data?: T): Promise<R | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result.data || result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      handleError(err as Error, `useApiMutation:${endpoint}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, handleError]);

  return {
    mutate,
    loading,
    error
  };
}
