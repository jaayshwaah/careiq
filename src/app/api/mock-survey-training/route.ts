// src/app/api/mock-survey-training/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action') || 'sessions';

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    const supa = supabaseServerWithAuth(token);

    if (action === 'sessions') {
      // Return available training sessions
      const mockSessions = [
        {
          id: "staffing-compliance",
          title: "Nursing Staff Compliance (F-514)",
          description: "Interactive training on F-514 nursing staff requirements, RN supervision, and adequate staffing documentation.",
          estimatedTime: "15-20 minutes",
          passingScore: 80,
          category: "Staffing",
          difficulty: "intermediate",
          tags: ["F-514", "staffing", "nursing", "supervision"],
          questionsCount: 8,
          totalPoints: 120
        },
        {
          id: "infection-control-training",
          title: "Infection Prevention & Control (F-686)",
          description: "Master F-686 requirements including IPCP programs, surveillance systems, and outbreak response protocols.",
          estimatedTime: "20-25 minutes",
          passingScore: 85,
          category: "Infection Control",
          difficulty: "advanced",
          tags: ["F-686", "infection-control", "IPCP", "surveillance"],
          questionsCount: 12,
          totalPoints: 200
        },
        {
          id: "qapi-fundamentals",
          title: "Quality Assurance & Performance Improvement (F-725)",
          description: "Learn QAPI program requirements, data-driven improvement processes, and systematic quality management.",
          estimatedTime: "18-22 minutes",
          passingScore: 80,
          category: "Quality Improvement",
          difficulty: "intermediate",
          tags: ["F-725", "QAPI", "quality-improvement", "data-analysis"],
          questionsCount: 10,
          totalPoints: 150
        },
        {
          id: "resident-rights-dignity",
          title: "Resident Rights and Dignity (F-550-580)",
          description: "Comprehensive training on resident rights, dignity, choice, and person-centered care requirements.",
          estimatedTime: "25-30 minutes",
          passingScore: 85,
          category: "Resident Rights",
          difficulty: "intermediate",
          tags: ["F-550", "F-580", "resident-rights", "dignity", "person-centered"],
          questionsCount: 15,
          totalPoints: 225
        },
        {
          id: "medication-management",
          title: "Pharmacy Services & Medication Management (F-755-760)",
          description: "Training on medication administration, storage, disposal, and pharmacy service requirements.",
          estimatedTime: "22-28 minutes",
          passingScore: 80,
          category: "Pharmacy",
          difficulty: "advanced",
          tags: ["F-755", "F-760", "medication", "pharmacy", "administration"],
          questionsCount: 14,
          totalPoints: 210
        },
        {
          id: "dietary-nutrition",
          title: "Dietary Services & Nutritional Care (F-800-812)",
          description: "Learn about dietary services, meal planning, nutritional assessments, and feeding assistance.",
          estimatedTime: "20-25 minutes",
          passingScore: 80,
          category: "Dietary",
          difficulty: "intermediate",
          tags: ["F-800", "F-812", "dietary", "nutrition", "meals"],
          questionsCount: 11,
          totalPoints: 165
        }
      ];

      return NextResponse.json({ ok: true, sessions: mockSessions });
    }

    if (action === 'progress' && sessionId) {
      // Get user progress for a specific session
      const { data: progress, error } = await supa
        .from('training_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', req.headers.get('x-user-id'))
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Progress fetch error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, progress: progress || null });
    }

    if (action === 'leaderboard') {
      // Get leaderboard data
      const { data: leaderboard, error } = await supa
        .from('training_results')
        .select(`
          user_id,
          session_id,
          score,
          percentage,
          completed_at,
          profiles(full_name, facility_name)
        `)
        .eq('passed', true)
        .order('percentage', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Leaderboard fetch error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, leaderboard: leaderboard || [] });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error('Mock Survey Training API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, progress, results } = body;

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    const supa = supabaseServerWithAuth(token);
    const userId = req.headers.get('x-user-id');

    if (action === 'save_progress') {
      // Save training session progress
      const { data, error } = await supa
        .from('training_progress')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          current_question: progress.currentQuestionIndex,
          answers: progress.answers,
          score: progress.score,
          time_spent: progress.timeSpent,
          started_at: progress.startedAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,session_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Save progress error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, progress: data });
    }

    if (action === 'complete_session') {
      // Save final results
      const { data: resultData, error: resultError } = await supa
        .from('training_results')
        .insert({
          user_id: userId,
          session_id: sessionId,
          score: results.score,
          max_score: results.maxScore,
          percentage: results.percentage,
          time_spent: results.timeSpent,
          questions_correct: results.questionsCorrect,
          total_questions: results.totalQuestions,
          passed: results.passed,
          answers: results.answers,
          completed_at: results.completedAt,
          session_data: results.sessionData
        })
        .select()
        .single();

      if (resultError) {
        console.error('Save results error:', resultError);
        return NextResponse.json({ ok: false, error: resultError.message }, { status: 500 });
      }

      // Clean up progress record
      await supa
        .from('training_progress')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      // Generate certificate if passed
      let certificateId = null;
      if (results.passed) {
        const { data: certData, error: certError } = await supa
          .from('training_certificates')
          .insert({
            user_id: userId,
            session_id: sessionId,
            result_id: resultData.id,
            certificate_number: `CERT-${Date.now()}-${userId?.slice(-4)}`,
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            status: 'active'
          })
          .select()
          .single();

        if (!certError) {
          certificateId = certData.id;
        }
      }

      return NextResponse.json({ 
        ok: true, 
        result: resultData,
        certificateId
      });
    }

    if (action === 'get_certificate') {
      // Generate/retrieve training certificate
      const { data: certificate, error } = await supa
        .from('training_certificates')
        .select(`
          *,
          training_results(*),
          profiles(full_name, facility_name)
        `)
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .order('issued_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Certificate fetch error:', error);
        return NextResponse.json({ ok: false, error: 'Certificate not found' }, { status: 404 });
      }

      return NextResponse.json({ ok: true, certificate });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error('Mock Survey Training API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    const supa = supabaseServerWithAuth(token);
    const userId = req.headers.get('x-user-id');

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Session ID required" }, { status: 400 });
    }

    // Delete training progress (for resetting session)
    const { error } = await supa
      .from('training_progress')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Delete progress error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Training progress reset successfully" });

  } catch (error: any) {
    console.error('Mock Survey Training API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}