// src/lib/supabase-server.ts
// Safe placeholder to avoid build-time crashes when env vars are missing.
// Replace with real Supabase server client when ready.
type MockResult<T = unknown> = { data: T | null; error: null };

function mockTable() {
  return {
    select: async (): Promise<MockResult<any[]>> => ({ data: [], error: null }),
    insert: (_: any) => ({
      select: () => ({
        single: async (): Promise<MockResult<any>> => ({ data: null, error: null }),
      }),
    }),
    update: (_: any) => ({
      eq: (_c: string, _v: any) => ({
        single: async (): Promise<MockResult<any>> => ({ data: null, error: null }),
      }),
    }),
    delete: () => ({
      eq: (_c: string, _v: any) => ({
        single: async (): Promise<MockResult<any>> => ({ data: null, error: null }),
      }),
    }),
    eq: (_c: string, _v: any) => ({
      select: async (): Promise<MockResult<any[]>> => ({ data: [], error: null }),
    }),
    order: (_c: string, _o?: any) => ({
      select: async (): Promise<MockResult<any[]>> => ({ data: [], error: null }),
    }),
  };
}

export function createClientServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Minimal mock client
    return {
      from: (_table: string) => mockTable(),
      auth: {
        getUser: async (): Promise<MockResult<{ id: string }>> => ({ data: { id: 'mock-user' }, error: null }),
        getSession: async (): Promise<MockResult<{ access_token: string }>> => ({ data: { access_token: 'mock' }, error: null }),
      },
    } as any;
  }

  // If you want real Supabase later, uncomment and add @supabase/ssr:
  // const { createServerClient } = await import('@supabase/ssr');
  // return createServerClient(url, key, { cookies: () => undefined as any });
  return {
    from: (_table: string) => mockTable(),
    auth: {
      getUser: async (): Promise<MockResult<{ id: string }>> => ({ data: { id: 'mock-user' }, error: null }),
      getSession: async (): Promise<MockResult<{ access_token: string }>> => ({ data: { access_token: 'mock' }, error: null }),
    },
  } as any;
}
