// src/lib/ai/chatSuggestions.ts - Smart suggestion system with weekly refresh and analytics

export interface ChatSuggestion {
  id: string;
  icon: string;
  title: string;
  text: string;
  category: 'clinical' | 'compliance' | 'operations' | 'quality' | 'staffing' | 'documentation';
  priority: number;
  clicks: number;
  impressions: number;
  created_at: string;
}

// Fallback suggestions if database is empty
const FALLBACK_SUGGESTIONS: Omit<ChatSuggestion, 'id' | 'clicks' | 'impressions' | 'created_at'>[] = [
  // Clinical
  { icon: "🏥", title: "Care Plans", text: "Help me create a comprehensive care plan for a new admission", category: 'clinical', priority: 10 },
  { icon: "💊", title: "Medications", text: "Review medication administration protocols for PRN orders", category: 'clinical', priority: 8 },
  { icon: "🩺", title: "Assessment", text: "Walk me through completing an MDS assessment for a new resident", category: 'clinical', priority: 9 },
  { icon: "🚑", title: "Emergency", text: "What's the proper protocol for a resident fall with head injury?", category: 'clinical', priority: 7 },
  
  // Compliance
  { icon: "📋", title: "Survey Prep", text: "Help me prepare for an upcoming CMS survey", category: 'compliance', priority: 10 },
  { icon: "⚖️", title: "F-Tags", text: "Explain F-Tag 689 requirements and how to stay compliant", category: 'compliance', priority: 9 },
  { icon: "📝", title: "Documentation", text: "What documentation is required for restraint use?", category: 'compliance', priority: 8 },
  { icon: "🎯", title: "Deficiencies", text: "How do I respond to a scope and severity deficiency?", category: 'compliance', priority: 7 },
  
  // Operations
  { icon: "👥", title: "Staffing", text: "Calculate PPD hours for our facility", category: 'staffing', priority: 9 },
  { icon: "📊", title: "PBJ", text: "Help me correct errors in our PBJ submission", category: 'operations', priority: 8 },
  { icon: "📅", title: "Scheduling", text: "Create a fair staff schedule that meets state requirements", category: 'staffing', priority: 7 },
  { icon: "💰", title: "Budget", text: "Analyze our supply costs and suggest cost reduction strategies", category: 'operations', priority: 6 },
  
  // Quality
  { icon: "📈", title: "Quality Measures", text: "How can we improve our quality indicator scores?", category: 'quality', priority: 8 },
  { icon: "⭐", title: "Star Rating", text: "What steps can increase our facility's star rating?", category: 'quality', priority: 9 },
  { icon: "🔍", title: "QAA", text: "Set up a Quality Assurance and Performance Improvement program", category: 'quality', priority: 7 },
  { icon: "📉", title: "Falls", text: "Develop a fall prevention program to reduce incidents", category: 'quality', priority: 8 },
  
  // Documentation
  { icon: "✍️", title: "Progress Notes", text: "Write a comprehensive progress note for a resident", category: 'documentation', priority: 7 },
  { icon: "📄", title: "Policies", text: "Draft a new infection control policy", category: 'documentation', priority: 6 },
  { icon: "📧", title: "Letters", text: "Help me write a professional letter to a resident's family", category: 'documentation', priority: 6 },
  { icon: "📑", title: "Reports", text: "Generate a monthly clinical quality report", category: 'documentation', priority: 7 },
];

/**
 * Get random suggestions for display
 * Prioritizes higher-priority and higher-clicked suggestions
 * @param count Number of suggestions to return
 * @param storedSuggestions Optional array of suggestions from database
 */
export function getRandomSuggestions(
  count: number = 6, 
  storedSuggestions?: ChatSuggestion[]
): ChatSuggestion[] {
  const suggestions = storedSuggestions && storedSuggestions.length > 0 
    ? storedSuggestions 
    : FALLBACK_SUGGESTIONS.map((s, i) => ({
        ...s,
        id: `fallback-${i}`,
        clicks: 0,
        impressions: 0,
        created_at: new Date().toISOString()
      }));

  // Weight suggestions by priority and click-through rate
  const weighted = suggestions.map(s => {
    const ctr = s.impressions > 0 ? s.clicks / s.impressions : 0;
    const weight = s.priority * 10 + ctr * 100;
    return { suggestion: s, weight: weight + Math.random() * 5 }; // Add randomness
  });

  // Sort by weight and return top N
  return weighted
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map(w => w.suggestion)
    .sort(() => Math.random() - 0.5); // Shuffle the selected suggestions
}

/**
 * Get diverse suggestions across all categories
 * NOW WITH TRUE RANDOMIZATION - picks random from each category
 */
export function getDiverseSuggestions(
  count: number = 6,
  storedSuggestions?: ChatSuggestion[]
): ChatSuggestion[] {
  const suggestions = storedSuggestions && storedSuggestions.length > 0
    ? storedSuggestions
    : FALLBACK_SUGGESTIONS.map((s, i) => ({
        ...s,
        id: `fallback-${i}`,
        clicks: 0,
        impressions: 0,
        created_at: new Date().toISOString()
      }));

  const categories: ChatSuggestion['category'][] = ['clinical', 'compliance', 'operations', 'quality', 'staffing', 'documentation'];
  const diverse: ChatSuggestion[] = [];

  // FIXED: Now picks RANDOM suggestion from each category (not just highest priority)
  const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
  
  for (const category of shuffledCategories) {
    const inCategory = suggestions.filter(s => s.category === category);
    if (inCategory.length > 0) {
      // Pick RANDOM from category (with slight priority weighting)
      const weighted = inCategory.map(s => ({
        suggestion: s,
        weight: s.priority + Math.random() * 15 // More randomness than priority
      }));
      weighted.sort((a, b) => b.weight - a.weight);
      diverse.push(weighted[0].suggestion);
    }
    if (diverse.length >= count) break;
  }

  // Fill remaining with random ones
  while (diverse.length < count && suggestions.length > diverse.length) {
    const remaining = suggestions.filter(s => !diverse.includes(s));
    if (remaining.length === 0) break;
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    diverse.push(random);
  }

  // Final shuffle for good measure
  return diverse.slice(0, count).sort(() => Math.random() - 0.5);
}

/**
 * Generate AI suggestions prompt for weekly batch generation
 */
export const WEEKLY_SUGGESTION_GENERATION_PROMPT = `You are a nursing home operations expert. Generate 100 diverse, actionable chat suggestions for CareIQ users.

Categories and distribution:
- Clinical (25): Care plans, medications, assessments, treatments, resident care
- Compliance (25): CMS regulations, F-Tags, surveys, documentation, policies
- Operations (20): Staffing, scheduling, budgets, supplies, logistics
- Quality (15): Quality measures, star ratings, QAA, improvement initiatives
- Staffing (10): PPD calculations, hiring, training, retention
- Documentation (5): Notes, letters, reports, policies

For each suggestion, provide:
1. icon: A single relevant emoji
2. title: 2-4 words (concise, action-oriented)
3. text: 8-15 words (specific, actionable question or request)
4. category: One of the categories above
5. priority: 1-10 (10=most important/common)

Format as JSON array. Make them:
- Specific and actionable
- Relevant to nursing home staff (nurses, administrators, DON, etc.)
- Varied in scope (some simple, some complex)
- Current with 2024-2025 CMS regulations
- Practical and immediately useful

Example:
{
  "icon": "🏥",
  "title": "Admission Care Plan",
  "text": "Create a 72-hour care plan for a new resident with diabetes and dementia",
  "category": "clinical",
  "priority": 9
}`;

/**
 * System prompt for generating more suggestions on-the-fly (emergency fallback)
 */
export const REALTIME_SUGGESTION_PROMPT = `Generate 4 diverse, actionable chat suggestions for a nursing home operations platform.

Categories: clinical, compliance, operations, quality, staffing, documentation

Return JSON array with format:
[
  {
    "icon": "🏥",
    "title": "Care Plans",
    "text": "Help me create a comprehensive care plan for a new admission",
    "category": "clinical",
    "priority": 9
  }
]

Make them specific, actionable, and immediately useful for nursing home staff.`;


