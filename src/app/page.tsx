// src/app/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">CareIQ</h1>
      <p className="opacity-80">
        Welcome. This build runs in mock mode — visit <code>/chat</code> to try the chat UI.
      </p>
      <a
        href="/chat"
        className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white"
      >
        Go to Chat
      </a>
    </main>
  );
}
