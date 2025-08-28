// src/components/RequireSubscription.tsx
"use client";

import { useEffect, useState } from "react";
import { userHasActiveSubscription } from "@/lib/subscription";
import BillingButtons from "./BillingButtons";

export default function RequireSubscription({
  children,
  priceId, // Stripe price to show in Subscribe button
}: {
  children: React.ReactNode;
  priceId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await userHasActiveSubscription();
      setActive(ok);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-neutral-500">Checking subscription…</div>;

  if (!active) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-lg font-semibold">Subscription required</div>
        <div className="text-neutral-600">
          Your subscription isn’t active. Subscribe or manage your billing below.
        </div>
        <BillingButtons priceId={priceId} />
      </div>
    );
  }

  return <>{children}</>;
}
