"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [role, setRole] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityState, setFacilityState] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/profile");
      const j = await r.json();
      if (j?.ok && j.profile) {
        setRole(j.profile.role ?? "");
        setFacilityName(j.profile.facility_name ?? "");
        setFacilityState(j.profile.facility_state ?? "");
      }
    })();
  }, []);

  const save = async () => {
    const r = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: role || null,
        facility_name: facilityName || null,
        facility_state: facilityState || null,
      }),
    });
    const j = await r.json();
    if (!j?.ok) alert(j?.error || "Failed to save");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Role (e.g., Administrator, DON)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Facility Name"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Facility State (e.g., MA)"
            value={facilityState}
            onChange={(e) => setFacilityState(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <button
            onClick={save}
            className="rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
      <p className="text-sm text-zinc-500">
        Your chat answers will automatically tailor citations and state-specific rules using these
        settings.
      </p>
    </div>
  );
}
