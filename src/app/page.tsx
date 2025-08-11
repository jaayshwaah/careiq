import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";
import Composer from "@/components/Composer";

export default function HomePage() {
  return (
    <div className="w-full h-full">
      {/* Big centered header */}
      <HeaderBanner />

      {/* Centered 2x2 suggestion bubbles */}
      <Suggestions targetId="composer-input" />

      {/* Slim → expanding composer */}
      <div className="mx-auto max-w-3xl px-4" style={{ background: "var(--bg)" }}>
        <div className="pb-10">
          <Composer
            id="composer-input"
            onSend={async (text) => {
              // TODO: wire to your chat API
              console.log("send:", text);
            }}
          />
        </div>
      </div>
    </div>
  );
}
