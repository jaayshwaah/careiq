import Suggestions from "@/components/Suggestions";

export default function HomePage() {
  return (
    <div className="w-full h-full">
      {/* Chat header bar */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-3">
          <h1 className="text-sm font-medium" style={{ color: "var(--text-dim)" }}>
            New Chat
          </h1>
        </div>
      </div>

      {/* Suggested messages (only on the new chat page) */}
      <Suggestions targetId="composer-input" />

      {/* Chat canvas */}
      <div className="mx-auto max-w-3xl px-4" style={{ background: "var(--bg)" }}>
        <div className="py-8 space-y-6">
          {/* Empty state */}
          <div
            className="rounded-2xl border"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <div className="p-6 text-sm" style={{ color: "var(--text-dim)" }}>
              Ask me anything to get started — or click a suggested prompt above.
            </div>
          </div>

          {/* Composer */}
          <form className="sticky bottom-6">
            <div
              className="rounded-2xl border p-3"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            >
              <textarea
                id="composer-input"
                className="input resize-none"
                rows={3}
                placeholder="Send a message…"
                style={{ background: "transparent", border: "none" }}
              />
              <div className="mt-3 flex justify-end">
                <button className="btn btn-primary" type="submit">Send</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
