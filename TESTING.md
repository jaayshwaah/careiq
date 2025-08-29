# Testing Guide

This project uses **Vitest** as the testing framework along with **React Testing Library** for component testing.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Running Tests

```bash
# Run tests in watch mode
npm run test

# Run all tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup
│   └── utils.tsx         # Testing utilities
├── lib/__tests__/        # Utility function tests
├── components/__tests__/ # Component tests
└── app/api/__tests__/    # API route tests
```

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### API Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('/api/my-endpoint', () => {
  it('should return expected response', async () => {
    const request = new NextRequest('http://localhost/api/my-endpoint');
    // Test your API handler
  });
});
```

### Utility Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myUtilFunction } from '../utils';

describe('myUtilFunction', () => {
  it('should work correctly', () => {
    expect(myUtilFunction('input')).toBe('expected output');
  });
});
```

## Test Coverage

The project aims for:
- **80%+ line coverage** for utility functions
- **70%+ line coverage** for components
- **90%+ line coverage** for critical business logic

## Mocking

### Supabase
```typescript
vi.mock('@/lib/supabaseClient', () => ({
  getBrowserSupabase: () => mockSupabaseClient
}));
```

### Next.js Router
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/'
}));
```

### API Calls
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'mock data' })
});
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Keep tests focused and small**
4. **Mock external dependencies**
5. **Test edge cases and error states**
6. **Use proper cleanup in tests**

## CI/CD

Tests are automatically run on:
- Every push to `main` or `develop` branches
- Every pull request
- Multiple Node.js versions (18.x, 20.x)

The pipeline includes:
- Linting
- Type checking  
- Unit tests
- Coverage reporting
- Build verification