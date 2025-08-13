"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="glass max-w-md p-6">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm opacity-70 break-words">
              {error?.message || "A client-side exception occurred."}
            </p>
            <button
              onClick={() => reset()}
              className="mt-4 inline-flex rounded-xl bg-black/10 px-3 py-2 text-sm hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
