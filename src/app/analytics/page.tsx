"use client";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/analytics");
        const json = await res.json();
        if (json?.ok) setData(json.analytics);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Loading analytics…</div>;
  if (!data) return <div className="p-6">No analytics available.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="glass rounded-xl p-6">
        <h1 className="text-xl font-semibold">Usage Analytics</h1>
        <p className="text-sm text-gray-600">Overview of your CareIQ usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-gray-500">Total Chats</div>
          <div className="text-2xl font-bold">{data.overview.totalChats}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-gray-500">Messages (30d)</div>
          <div className="text-2xl font-bold">{data.overview.totalMessages}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-gray-500">KB Items</div>
          <div className="text-2xl font-bold">{data.overview.knowledgeBaseItems}</div>
        </div>
      </div>
    </div>
  );
}

