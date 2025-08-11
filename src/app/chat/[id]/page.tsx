type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

// Fetch your messages here (Server Component ok)
async function getMessages(id: string): Promise<Message[]> {
  // Replace with real fetch
  return [
    // demo
    { id: "m1", role: "user", content: "Hello!" },
    { id: "m2", role: "assistant", content: "Hi there — how can I help?" },
  ];
}

export default async function ChatThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const messages = await getMessages(params.id);

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--panel)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-3">
          <h1 className="text-sm font-medium" style={{ color: "var(--text-dim)" }}>
            Chat
          </h1>
        </div>
      </div>

      {/* Messages */}
      <div
        className="mx-auto max-w-3xl px-4"
        style={{ background: "var(--bg)" }}
      >
        <div className="py-8 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="w-full">
              <div
                className="rounded-2xl border p-4"
                style={{
                  background:
                    m.role === "assistant" ? "var(--panel)" : "var(--panel-2)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-dim)" }}
                >
                  {m.role}
                </div>
                <div className="text-sm" style={{ color: "var(--text)" }}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {/* Composer */}
          <form className="sticky bottom-6 pt-4">
            <div
              className="rounded-2xl border p-3"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            >
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Send a message…"
                style={{ background: "transparent", border: "none" }}
              />
              <div className="mt-3 flex justify-end">
                <button className="btn btn-primary">Send</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
