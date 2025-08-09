'use client';
import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

const ROLES = [
  'Administrator','Director of Nursing','HR/Payroll','MDS Coordinator',
  'Infection Preventionist','LPN','CNA','Activities','Dietary','Other',
] as const;

export default function RegisterPage() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('Other');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { data: authRes, error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;
      const user = authRes.user;
      if (!user) throw new Error('Signup failed');

      const { data: fac } = await supabase
        .from('facilities').select('id').eq('name', facilityName).maybeSingle();

      let facilityId = fac?.id;
      if (!facilityId) {
        const { data: newFac, error: facErr } = await supabase
          .from('facilities').insert({ name: facilityName }).select('id').single();
        if (facErr) throw facErr;
        facilityId = newFac.id;
      }

      const { error: profErr } = await supabase.from('profiles').insert({
        user_id: user.id,
        full_name: fullName,
        role,
        facility_id: facilityId,
      });
      if (profErr) throw profErr;

      setMsg('Registered! Check your email to verify, then log in.');
    } catch (err: any) {
      setMsg(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your CareIQ account</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border rounded p-2" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
        <input className="w-full border rounded p-2" placeholder="Facility name" value={facilityName} onChange={e => setFacilityName(e.target.value)} required />
        <select className="w-full border rounded p-2" value={role} onChange={e => setRole(e.target.value as any)}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="w-full border rounded p-2" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-black text-white rounded p-2 disabled:opacity-50" disabled={loading}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <p className="mt-4 text-sm">Already have an account? <a className="underline" href="/login">Log in</a></p>
    </div>
  );
}
