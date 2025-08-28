// src/app/billing/page.tsx
"use client";
import RequireSubscription from "@/components/RequireSubscription";

export default function BillingPage() {
  return (
    <RequireSubscription priceId="price_123">
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">You’re subscribed 🎉</h1>
        <p className="text-neutral-600">Enjoy full access to premium features.</p>
      </div>
    </RequireSubscription>
  );
}
