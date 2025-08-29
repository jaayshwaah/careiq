import { describe, it, expect, beforeEach, vi } from 'vitest';
import rateLimiter, { rateLimit, RATE_LIMITS, getClientKey } from '../rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset the rate limiter state before each test
    rateLimiter['store'].clear();
  });

  describe('getClientKey', () => {
    it('should extract user key from authorization header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'authorization': 'Bearer test-token-123'
        }
      });
      
      const key = getClientKey(request);
      expect(key).toMatch(/^user:/);
    });

    it('should use IP-based key when no auth header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const key = getClientKey(request);
      expect(key).toBe('ip:192.168.1.1');
    });

    it('should handle unknown IP', () => {
      const request = new Request('http://localhost');
      
      const key = getClientKey(request);
      expect(key).toBe('ip:unknown');
    });
  });

  describe('rateLimit', () => {
    it('should allow requests within limit', async () => {
      const request = new Request('http://localhost');
      const config = { maxRequests: 5, windowMs: 60000 };
      
      const result = await rateLimit(request, config);
      expect(result).toBeNull(); // null means allowed
    });

    it('should block requests exceeding limit', async () => {
      const request = new Request('http://localhost');
      const config = { maxRequests: 1, windowMs: 60000 };
      
      // First request should be allowed
      const firstResult = await rateLimit(request, config);
      expect(firstResult).toBeNull();
      
      // Second request should be blocked
      const secondResult = await rateLimit(request, config);
      expect(secondResult).toBeInstanceOf(Response);
      
      if (secondResult) {
        expect(secondResult.status).toBe(429);
        const body = await secondResult.json();
        expect(body.error).toBe('Rate limit exceeded');
      }
    });

    it('should reset after window expires', async () => {
      const request = new Request('http://localhost');
      const config = { maxRequests: 1, windowMs: 1 }; // Very short window
      
      // First request should be allowed
      const firstResult = await rateLimit(request, config);
      expect(firstResult).toBeNull();
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 2));
      
      // Request after window should be allowed
      const secondResult = await rateLimit(request, config);
      expect(secondResult).toBeNull();
    });
  });

  describe('RATE_LIMITS constants', () => {
    it('should have reasonable default limits', () => {
      expect(RATE_LIMITS.CHAT.maxRequests).toBe(50);
      expect(RATE_LIMITS.SEARCH.maxRequests).toBe(100);
      expect(RATE_LIMITS.FACILITY_ANALYSIS.maxRequests).toBe(10);
      expect(RATE_LIMITS.DEFAULT.maxRequests).toBe(60);
    });

    it('should have 1-hour windows for all limits', () => {
      const oneHour = 60 * 60 * 1000;
      expect(RATE_LIMITS.CHAT.windowMs).toBe(oneHour);
      expect(RATE_LIMITS.SEARCH.windowMs).toBe(oneHour);
      expect(RATE_LIMITS.DEFAULT.windowMs).toBe(oneHour);
    });
  });
});