import { createClientServer } from '@/lib/supabase';

export default async function HomePage() {
  const supabase = createClientServer();
  const [{ data: userRes }, { data: profileRes }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('full_name, role, facility_id').maybeSingle(),
  ]);

  const user = userRes.user;
  const profile = profileRes;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">CareIQ</h1>
      <p className="text-sm text-gray-600">You are logged in as <b>{user?.email}</b></p>
      <div className="mt-4 space-y-1">
        <p><b>Name:</b> {profile?.full_name ?? '—'}</p>
        <p><b>Role:</b> {profile?.role ?? '—'}</p>
        <p><b>Facility ID:</b> {profile?.facility_id ?? '—'}</p>
      </div>
      <form action="/api/logout" method="post" className="mt-6">
        <button className="border rounded px-3 py-2">Log out</button>
      </form>
    </main>
  );
}
