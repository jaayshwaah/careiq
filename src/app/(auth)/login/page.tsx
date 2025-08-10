// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm opacity-70">Mock auth for now — no backend calls.</p>
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
          onClick={() => alert('Mock login only.')}
        >
          Sign in
        </button>
      </div>
    </main>
  );
}
