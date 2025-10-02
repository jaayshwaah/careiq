// Rate limiter utility using in-memory store
// For production, consider using Redis or a database

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now;
    const resetTime = windowStart + config.windowMs;

    let entry = this.store.get(key);

    // If no entry exists or the window has reset, create a new one
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime
      };
      this.store.set(key, entry);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime
      };
    }

    // Check if limit is exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Cleanup method
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Rate limiting configurations for different endpoints
export const RATE_LIMITS = {
  // Generous limits for light usage
  CHAT: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  SEARCH: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  API: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200 per hour for general API calls
  UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  ANALYSIS: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  
  // Stricter limits for expensive operations
  FACILITY_ANALYSIS: { maxRequests: 20, windowMs: 15 * 60 * 1000 }, // 20 per 15 minutes
  PDF_EXPORT: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  
  // Very strict limits for admin operations
  ADMIN: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  
  // Default fallback
  DEFAULT: { maxRequests: 60, windowMs: 60 * 60 * 1000 }, // 60 per hour
} as const;

// Helper function to get client identifier
export function getClientKey(request: Request): string {
  // Try to get user ID from authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // This is a simplified example - you'd want to properly decode the JWT
      const token = authHeader.replace('Bearer ', '');
      // For now, use a hash of the token as the key
      return `user:${btoa(token).slice(0, 16)}`;
    } catch {
      // Fall through to IP-based limiting
    }
  }

  // Fallback to IP-based limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

// Main rate limiting middleware
export async function rateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): Promise<Response | null> {
  const key = config.keyGenerator ? config.keyGenerator(request) : getClientKey(request);
  
  const result = await rateLimiter.checkLimit(key, config);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  // Add rate limit headers to successful responses (these will be added by the calling code)
  return null; // null means request is allowed
}

// Helper to add rate limit headers to responses
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetTime: number,
  limit: number
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-RateLimit-Limit', limit.toString());
  newHeaders.set('X-RateLimit-Remaining', remaining.toString());
  newHeaders.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default rateLimiter;