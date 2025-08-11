import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";

export default function HomePage() {
  return (
    <div className="w-full h-full">
      {/* Randomized main header on each load */}
      <HeaderBanner subline="Start with a prompt below or type your own." />

      {/* Suggested messages (centered buttons, below header) */}
      <Suggestions targetId="composer-input" />

      {/* Chat canvas */}
      <div className="mx-auto max-w-3xl px-4" style={{ background: "var(--bg)" }}>
        <div className="py-8 space-y-6">
          {/* Empty state card (optional) */}
          <div
            className="rounded-2xl border"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <div className="p-6 text-sm" style={{ color: "var(--text-dim)" }}>
              Ask me anything — HR, PBJ, staffing, payroll, survey readiness, and more.
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
