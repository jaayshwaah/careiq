// src/app/calendar/page.tsx
"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  title: string;
  date: string; // ISO date
  category?: string | null;
  notes?: string | null;
};

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    const res = await fetch("/api/calendar");
    const j = await res.json();
    if (j?.ok) setEvents(j.events);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!title || !date) return;
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, category }),
    });
    const j = await res.json();
    if (j?.ok) {
      setTitle("");
      setDate("");
      setCategory("");
      load();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance Calendar</h1>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Title (e.g., Annual Survey Window)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Category (training, drills, survey…) "
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <button
            onClick={add}
            className="rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Add Event
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {events.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <div>
              <div className="font-medium">{e.title}</div>
              <div className="text-zinc-500">
                {new Date(e.date).toLocaleDateString()} {e.category ? `• ${e.category}` : ""}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-sm text-zinc-500">No events yet. Add your first deadline above.</div>
        )}
      </div>
    </div>
  );
}
