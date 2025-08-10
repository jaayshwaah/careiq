// src/app/(auth)/register/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="text-sm opacity-70">Mock registration for now — no backend calls.</p>
      <div className="space-y-3">
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white"
          onClick={() => alert('Mock registration only.')}
        >
          Sign up
        </button>
      </div>
    </main>
  );
}
