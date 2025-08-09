'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

const ROLES = [
  'Administrator',
  'Director of Nursing',
  'HR/Payroll',
  'MDS Coordinator',
  'Infection Preventionist',
  'LPN',
  'CNA',
  'Activities',
  'Dietary',
  'Other',
] as const;

export default function RegisterPage() {
  const supabase = createClientBrowser();

  const [fullName, setFullName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('Other');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createFacilityAndProfile(userId: string) {
    // Try to find existing facility by name
    const { data: existingFac, error: findErr } = await supabase
      .from('facilities')
      .select('id')
      .eq('name', facilityName)
      .maybeSingle();

    if (findErr) {
      // If RLS blocks select (unlikely with our policy), surface it
      throw new Error(`Facility lookup failed: ${findErr.message}`);
    }

    let facilityId = existingFac?.id;

    // Create facility if not found (requires you to have the policy:
    //   Facilities: insert for authenticated
    //   on public.facilities for insert with check (auth.role() = 'authenticated');
    if (!facilityId) {
      const { data: newFac, error: insertFacErr } = await supabase
        .from('facilities')
        .insert({ name: facilityName })
        .select('id')
        .single();

      if (insertFacErr) {
        // Common cause: user is not authenticated yet (email confirmations ON)
        // or missing insert policy on facilities → helpful message:
        if (
          /row-level security/i.test(insertFacErr.message) ||
          /RLS/i.test(insertFacErr.message)
        ) {
          throw new Error(
            'Could not create facility due to Row Level Security. If you have email confirmations ON, please verify your email first and then log in. Alternatively, enable the insert policy on facilities for authenticated users.'
          );
        }
        throw new Error(insertFacErr.message);
      }

      facilityId = newFac.id;
    }

    // Create profile for this user
    const { error: profileErr } = await supabase.from('profiles').insert({
      user_id: userId,
      full_name: fullName,
      role,
      facility_id: facilityId,
    });

    if (profileErr) {
      if (/row-level security/i.test(profileErr.message) || /RLS/i.test(profileErr.message)) {
        throw new Error(
          'Could not create profile due to Row Level Security. If email confirmations are ON, verify your email and log in first.'
        );
      }
      throw new Error(profileErr.message);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      // 1) Create auth user
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw signUpErr;

      const userId = data.user?.id ?? null;
      const session = data.session ?? null;

      // If there is NO session, email confirmations are likely ON.
      // We cannot insert into RLS-protected tables without an authenticated JWT.
      if (!session || !userId) {
        setMsg(
          'Account created. Please check your email to verify your account. After you log in, your facility and profile will be created automatically.'
        );
        return;
      }

      // 2) We ARE authenticated (confirmations OFF) — create facility + profile now
      await createFacilityAndProfile(userId);
      setMsg('Registered successfully! You can go to the home page or start using the app.');
    } catch (err: any) {
      setMsg(err?.message || 'Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your CareIQ account</h1>

      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full border rounded p-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Facility name"
          value={facilityName}
          onChange={(e) => setFacilityName(e.target.value)}
          required
        />

        <select
          className="w-full border rounded p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <input
          className="w-full border rounded p-2"
          placeholder="Work email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          className="w-full bg-black text-white rounded p-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>

      {msg && <p className="mt-3 text-sm">{msg}</p>}

      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <a className="underline" href="/login">
          Log in
        </a>
      </p>
    </div>
  );
}
