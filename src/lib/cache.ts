// Client-side caching utilities
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key for API requests
  static generateKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
  }
}

// React hook for cached data fetching
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300000
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const cache = CacheManager.getInstance();

  const fetchData = async () => {
    // Check cache first
    const cachedData = cache.get(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      cache.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    cache.delete(key);
    fetchData();
  };

  React.useEffect(() => {
    fetchData();
  }, [key]);

  return { data, loading, error, refetch };
}

// Server-side caching headers
export function getCacheHeaders(type: 'static' | 'dynamic' | 'api' = 'static') {
  const headers = new Headers();

  switch (type) {
    case 'static':
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;
    case 'dynamic':
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      break;
    case 'api':
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
      break;
  }

  return headers;
}

// Preload critical resources
export function preloadResource(href: string, as: string = 'script') {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

// Prefetch resources for next page
export function prefetchResource(href: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}
