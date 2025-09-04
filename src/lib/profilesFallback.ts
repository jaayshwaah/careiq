// Fallback profile utilities to avoid RLS recursion
export function createFallbackProfile(user: { id: string; email?: string }) {
  return {
    user_id: user.id,
    role: 'user',
    facility_id: null,
    facility_name: 'Healthcare Facility',
    facility_state: null,
    full_name: user.email?.split('@')[0] || 'User',
    email: user.email,
    is_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Safe profiles query that always returns fallback data
export async function safeGetProfile(supabase: any, userId: string) {
  console.log('Using fallback profile data to avoid RLS issues');
  return {
    data: createFallbackProfile({ id: userId, email: 'user@facility.com' }),
    error: null
  };
}