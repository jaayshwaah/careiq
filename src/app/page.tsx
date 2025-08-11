import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";
import Composer from "@/components/Composer";

export default function HomePage() {
  return (
    <div className="w-full h-full">
      {/* Big centered header */}
      <HeaderBanner />

      {/* Smaller 2×2 suggestion bubbles */}
      <Suggestions targetId="composer-input" />

      {/* Slim → expanding composer */}
      <div className="mx-auto max-w-3xl px-4" style={{ background: "var(--bg)" }}>
        <div className="pb-10">
          <Composer id="composer-input" />
        </div>
      </div>
    </div>
  );
}
