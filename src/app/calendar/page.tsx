// src/app/calendar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Calendar, AlertTriangle, CheckCircle, Clock, Calculator } from "lucide-react";
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

type Event = {
  id: string;
  title: string;
  date: string; // ISO date
  category?: string | null;
  notes?: string | null;
};

// Survey window configurations by state
const stateWindows: { [key: string]: { window: number; description: string } } = {
  'AL': { window: 365, description: 'Alabama: Within 15 months (average 12 months)' },
  'AK': { window: 457, description: 'Alaska: Within 15 months' },
  'AZ': { window: 457, description: 'Arizona: Within 15 months' },
  'AR': { window: 365, description: 'Arkansas: Within 12 months (average 9-12 months)' },
  'CA': { window: 457, description: 'California: Within 15 months' },
  'CO': { window: 457, description: 'Colorado: Within 15 months' },
  'CT': { window: 457, description: 'Connecticut: Within 15 months' },
  'DE': { window: 457, description: 'Delaware: Within 15 months' },
  'FL': { window: 457, description: 'Florida: Within 15 months' },
  'GA': { window: 457, description: 'Georgia: Within 15 months' },
  'HI': { window: 457, description: 'Hawaii: Within 15 months' },
  'ID': { window: 457, description: 'Idaho: Within 15 months' },
  'IL': { window: 457, description: 'Illinois: Within 15 months' },
  'IN': { window: 457, description: 'Indiana: Within 15 months' },
  'IA': { window: 457, description: 'Iowa: Within 15 months' },
  'KS': { window: 457, description: 'Kansas: Within 15 months' },
  'KY': { window: 457, description: 'Kentucky: Within 15 months' },
  'LA': { window: 457, description: 'Louisiana: Within 15 months' },
  'ME': { window: 457, description: 'Maine: Within 15 months' },
  'MD': { window: 457, description: 'Maryland: Within 15 months' },
  'MA': { window: 457, description: 'Massachusetts: Within 15 months' },
  'MI': { window: 457, description: 'Michigan: Within 15 months' },
  'MN': { window: 457, description: 'Minnesota: Within 15 months' },
  'MS': { window: 457, description: 'Mississippi: Within 15 months' },
  'MO': { window: 457, description: 'Missouri: Within 15 months' },
  'MT': { window: 457, description: 'Montana: Within 15 months' },
  'NE': { window: 457, description: 'Nebraska: Within 15 months' },
  'NV': { window: 457, description: 'Nevada: Within 15 months' },
  'NH': { window: 457, description: 'New Hampshire: Within 15 months' },
  'NJ': { window: 457, description: 'New Jersey: Within 15 months' },
  'NM': { window: 457, description: 'New Mexico: Within 15 months' },
  'NY': { window: 457, description: 'New York: Within 15 months' },
  'NC': { window: 457, description: 'North Carolina: Within 15 months' },
  'ND': { window: 457, description: 'North Dakota: Within 15 months' },
  'OH': { window: 457, description: 'Ohio: Within 15 months' },
  'OK': { window: 457, description: 'Oklahoma: Within 15 months' },
  'OR': { window: 457, description: 'Oregon: Within 15 months' },
  'PA': { window: 457, description: 'Pennsylvania: Within 15 months' },
  'RI': { window: 457, description: 'Rhode Island: Within 15 months' },
  'SC': { window: 457, description: 'South Carolina: Within 15 months' },
  'SD': { window: 457, description: 'South Dakota: Within 15 months' },
  'TN': { window: 457, description: 'Tennessee: Within 15 months' },
  'TX': { window: 365, description: 'Texas: Within 12 months (average 9-12 months)' },
  'UT': { window: 457, description: 'Utah: Within 15 months' },
  'VT': { window: 457, description: 'Vermont: Within 15 months' },
  'VA': { window: 457, description: 'Virginia: Within 15 months' },
  'WA': { window: 457, description: 'Washington: Within 15 months' },
  'WV': { window: 457, description: 'West Virginia: Within 15 months' },
  'WI': { window: 457, description: 'Wisconsin: Within 15 months' },
  'WY': { window: 457, description: 'Wyoming: Within 15 months' }
};

export default function ComplianceCalendarPage() {
  const { user } = useAuth();
  const supabase = getBrowserSupabase();
  const [events, setEvents] = useState<Event[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  
  // Survey window calculator state
  const [showSurveyCalculator, setShowSurveyCalculator] = useState(false);
  const [lastSurveyDate, setLastSurveyDate] = useState("");
  const [facilityState, setFacilityState] = useState("");
  const [surveyWindow, setSurveyWindow] = useState<any>(null);

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

  const calculateSurveyWindow = async () => {
    if (!lastSurveyDate || !facilityState || !user) return;
    
    const stateConfig = stateWindows[facilityState];
    if (!stateConfig) return;
    
    const lastSurvey = new Date(lastSurveyDate);
    const windowStart = new Date(lastSurvey);
    windowStart.setDate(windowStart.getDate() + 275); // 9 months minimum
    
    const windowEnd = new Date(lastSurvey);
    windowEnd.setDate(windowEnd.getDate() + stateConfig.window);
    
    const today = new Date();
    const daysUntilWindow = Math.ceil((windowStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilExpiry = Math.ceil((windowEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const isInWindow = today >= windowStart && today <= windowEnd;
    const isOverdue = today > windowEnd;
    
    const surveyData = {
      state: facilityState,
      lastSurveyDate: lastSurvey,
      windowStart,
      windowEnd,
      daysUntilWindow,
      daysUntilExpiry,
      isInWindow,
      isOverdue,
      description: stateConfig.description
    };
    
    setSurveyWindow(surveyData);
    
    // Save to database for dashboard countdown
    try {
      await supabase
        .from('survey_windows')
        .upsert({
          user_id: user.id,
          facility_state: facilityState,
          last_survey_date: lastSurveyDate,
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          days_until_window: daysUntilWindow,
          days_until_expiry: daysUntilExpiry,
          is_in_window: isInWindow,
          is_overdue: isOverdue,
          state_description: stateConfig.description,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.warn('Failed to save survey window to database:', error);
    }
  };

  const addSurveyToCalendar = () => {
    if (!surveyWindow) return;
    
    const middleOfWindow = new Date(surveyWindow.windowStart);
    middleOfWindow.setDate(middleOfWindow.getDate() + 60); // Add ~2 months to window start
    
    setTitle("State Survey Window");
    setDate(middleOfWindow.toISOString().split('T')[0]);
    setCategory("Survey");
    setShowSurveyCalculator(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance Calendar</h1>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-zinc-300 dark:border-zinc-600 dark:bg-gray-700 dark:text-white px-3 py-2"
            placeholder="Title (e.g., Annual Survey Window)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 dark:border-zinc-600 dark:bg-gray-700 dark:text-white px-3 py-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-300 dark:border-zinc-600 dark:bg-gray-700 dark:text-white px-3 py-2"
            placeholder="Category (training, drills, survey…) "
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-3">
          <button
            onClick={add}
            className="rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Add Event
          </button>
          <button
            onClick={() => setShowSurveyCalculator(!showSurveyCalculator)}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Calculator size={16} />
            Survey Calculator
          </button>
        </div>
      </div>

      {/* Survey Window Calculator */}
      {showSurveyCalculator && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calculator className="text-blue-600" size={20} />
            Survey Window Calculator
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Last Survey Date</label>
              <input
                type="date"
                value={lastSurveyDate}
                onChange={(e) => setLastSurveyDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Facility State</label>
              <select
                value={facilityState}
                onChange={(e) => setFacilityState(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select State</option>
                {Object.entries(stateWindows).map(([state, config]) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            onClick={calculateSurveyWindow}
            disabled={!lastSurveyDate || !facilityState}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Calculate Survey Window
          </button>
          
          {surveyWindow && (
            <div className="mt-6 p-4 rounded-lg bg-white dark:bg-gray-800 border">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                {surveyWindow.isOverdue ? (
                  <AlertTriangle className="text-red-600" size={20} />
                ) : surveyWindow.isInWindow ? (
                  <Clock className="text-orange-600" size={20} />
                ) : (
                  <CheckCircle className="text-green-600" size={20} />
                )}
                Survey Window Results
              </h3>
              
              <div className="space-y-2 text-sm">
                <p><strong>State:</strong> {surveyWindow.state}</p>
                <p><strong>Last Survey:</strong> {surveyWindow.lastSurveyDate.toLocaleDateString()}</p>
                <p><strong>Window Opens:</strong> {surveyWindow.windowStart.toLocaleDateString()}</p>
                <p><strong>Window Closes:</strong> {surveyWindow.windowEnd.toLocaleDateString()}</p>
                <p className="text-gray-600 text-xs">{surveyWindow.description}</p>
              </div>
              
              <div className={`mt-3 p-3 rounded-md ${
                surveyWindow.isOverdue 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : surveyWindow.isInWindow
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {surveyWindow.isOverdue 
                  ? `⚠️ Survey is OVERDUE by ${Math.abs(surveyWindow.daysUntilExpiry)} days`
                  : surveyWindow.isInWindow
                  ? `🔔 Currently in survey window! Survey due within ${surveyWindow.daysUntilExpiry} days`
                  : `✅ Survey window opens in ${surveyWindow.daysUntilWindow} days`
                }
              </div>
              
              <div className="mt-4">
                <button
                  onClick={addSurveyToCalendar}
                  className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 text-sm"
                >
                  Add Survey Window to Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
