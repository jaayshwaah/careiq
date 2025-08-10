import './globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';
import { createClientServer } from '@/lib/supabase-server';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-dvh antialiased">
        <div className="flex h-full">
          <aside className="hidden md:flex w-72 flex-col border-r bg-gray-50">
            <div className="p-3 border-b">
              <Link className="font-semibold" href="/">CareIQ</Link>
            </div>
            <div className="p-3">
              <form action="/api/conversations" method="post">
                <button className="w-full rounded border px-3 py-2 text-left">+ New chat</button>
              </form>
            </div>
            {/* Conversations */}
            <div className="flex-1 overflow-auto">
              {/* @ts-expect-error Server Component */}
              <ConversationsList />
            </div>
            <div className="mt-auto p-3 border-t text-sm">
              {/* @ts-expect-error Server Component */}
              <ProfileBlock />
            </div>
          </aside>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

async function ConversationsList() {
  const supabase = createClientServer();
  const { data: convos } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false });

  if (!convos || convos.length === 0) {
    return <div className="px-3 pb-3 text-sm text-gray-500">No conversations yet</div>;
  }

  return (
    <ul className="px-3 space-y-1">
      {convos.map((c) => (
        <li key={c.id}>
          <a href={`/chat/${c.id}`} className="block truncate rounded px-2 py-1 hover:bg-gray-100">
            {c.title || 'Untitled'}
          </a>
        </li>
      ))}
    </ul>
  );
}

async function ProfileBlock() {
  const supabase = createClientServer();
  const [{ data: userRes }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('full_name, role').maybeSingle(),
  ]);
  const email = userRes.user?.email;

  return (
    <div>
      <div className="font-medium">{profile?.full_name ?? '—'}</div>
      <div className="text-gray-600">{profile?.role ?? '—'}</div>
      <div className="text-gray-500 truncate">{email}</div>
      <form action="/api/logout" method="post" className="mt-2">
        <button className="w-full rounded border px-3 py-1">Log out</button>
      </form>
    </div>
  );
}
