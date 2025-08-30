"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Award, 
  BarChart3,
  Eye,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Star,
  AlertTriangle,
  BookOpen,
  Target,
  Timer,
  Users,
  Shield,
  TrendingUp,
  Download,
  Share2,
  Settings
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import TrainingDashboard from "@/components/TrainingDashboard";

interface SurveyQuestion {
  id: string;
  category: string;
  regulation: string;
  question: string;
  scenario?: string;
  type: 'multiple-choice' | 'open-ended' | 'document-review' | 'observation';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  options?: string[];
  correctAnswer?: number | string;
  explanation: string;
  tips: string[];
  commonMistakes: string[];
  followUpQuestions?: string[];
  timeLimit?: number; // in seconds
  points: number;
  tags: string[];
}

interface TrainingSession {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  questions: SurveyQuestion[];
  passingScore: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

interface UserProgress {
  sessionId: string;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  score: number;
  timeSpent: number;
  startedAt: string;
  completedAt?: string;
  passed?: boolean;
}

// Mock training sessions data
const trainingSessions: TrainingSession[] = [
  {
    id: "staffing-compliance",
    title: "Nursing Staff Compliance (F-514)",
    description: "Interactive training on F-514 nursing staff requirements, RN supervision, and adequate staffing documentation.",
    estimatedTime: "15-20 minutes",
    passingScore: 80,
    category: "Staffing",
    difficulty: "intermediate",
    tags: ["F-514", "staffing", "nursing", "supervision"],
    questions: [
      {
        id: "staff-1",
        category: "Staffing",
        regulation: "F-514",
        question: "What is the minimum RN supervision requirement for nursing homes?",
        type: "multiple-choice",
        difficulty: "basic",
        options: [
          "4 hours per day, 5 days a week",
          "8 consecutive hours per day, 7 days a week", 
          "12 hours per day, 6 days a week",
          "24 hours per day, 5 days a week"
        ],
        correctAnswer: 1,
        explanation: "F-514 requires RN supervision for at least 8 consecutive hours per day, 7 days a week. This ensures continuous professional nursing oversight of resident care.",
        tips: [
          "The 8 hours must be consecutive, not split shifts",
          "This applies to all nursing homes regardless of size",
          "Documentation of RN coverage is critical for compliance"
        ],
        commonMistakes: [
          "Thinking split shifts satisfy the requirement",
          "Not documenting RN presence adequately",
          "Assuming weekends have different requirements"
        ],
        followUpQuestions: [
          "How would you handle an unexpected RN absence?",
          "What documentation proves RN supervision compliance?"
        ],
        timeLimit: 90,
        points: 10,
        tags: ["RN-supervision", "basic-requirements"]
      },
      {
        id: "staff-2",
        category: "Staffing",
        regulation: "F-514",
        scenario: "During your survey, you notice that yesterday's staffing records show the RN left at 2:30 PM and the next RN didn't arrive until 11:00 PM the same day. The facility has 45 residents.",
        question: "What is the primary compliance issue with this scenario?",
        type: "multiple-choice",
        difficulty: "intermediate",
        options: [
          "The facility is understaffed for the number of residents",
          "There was a gap in RN supervision coverage",
          "The shift change time is inappropriate",
          "The documentation is incomplete"
        ],
        correctAnswer: 1,
        explanation: "The primary issue is the gap in RN supervision. F-514 requires 8 consecutive hours of RN supervision daily, and an 8.5-hour gap violates this requirement regardless of other factors.",
        tips: [
          "Look for gaps in RN coverage when reviewing staffing records",
          "8 consecutive hours means no interruption in professional supervision",
          "Facilities must have contingency plans for unexpected absences"
        ],
        commonMistakes: [
          "Focusing only on total hours worked rather than consecutive coverage",
          "Not recognizing supervision gaps as immediate jeopardy risks",
          "Accepting facility explanations without verifying coverage"
        ],
        followUpQuestions: [
          "What immediate actions would you expect from the facility?",
          "How would you verify corrective measures?"
        ],
        timeLimit: 120,
        points: 15,
        tags: ["scenario-based", "coverage-gaps", "supervision"]
      },
      {
        id: "staff-3",
        category: "Staffing",
        regulation: "F-514", 
        question: "When reviewing staffing adequacy, what key factors should you assess beyond minimum requirements?",
        type: "open-ended",
        difficulty: "advanced",
        explanation: "Comprehensive staffing assessment includes: resident acuity levels, staff competency and training, consistent assignment patterns, staff turnover rates, use of agency staff, emergency coverage plans, and documentation of staffing decisions based on resident needs.",
        tips: [
          "Consider both quantity and quality of staffing",
          "Review staff competencies and training records",
          "Assess consistency of assignments for resident familiarity",
          "Evaluate emergency coverage protocols"
        ],
        commonMistakes: [
          "Only checking minimum hour requirements",
          "Ignoring staff competency levels",
          "Not assessing resident-specific needs",
          "Overlooking consistent assignment benefits"
        ],
        timeLimit: 300,
        points: 20,
        tags: ["comprehensive-assessment", "quality-indicators", "advanced"]
      }
    ]
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
    questions: [
      {
        id: "ic-1",
        category: "Infection Control",
        regulation: "F-686",
        question: "What are the essential components of an effective Infection Prevention and Control Program (IPCP)?",
        type: "multiple-choice",
        difficulty: "intermediate",
        options: [
          "Written policies and staff education only",
          "Infection preventionist, policies, surveillance, education, and reporting",
          "Hand hygiene monitoring and PPE supplies",
          "Isolation rooms and antimicrobial stewardship"
        ],
        correctAnswer: 1,
        explanation: "F-686 requires a comprehensive IPCP including: designated infection preventionist, written policies, surveillance systems, staff education, isolation precautions, and communicable disease reporting.",
        tips: [
          "IPCP must be comprehensive, not just basic infection control",
          "Infection preventionist must have specialized training",
          "All components work together for effective prevention"
        ],
        commonMistakes: [
          "Thinking basic hand hygiene policies are sufficient",
          "Not verifying infection preventionist qualifications",
          "Missing surveillance system requirements"
        ],
        timeLimit: 120,
        points: 15,
        tags: ["IPCP-components", "comprehensive-program"]
      },
      {
        id: "ic-2",
        category: "Infection Control",
        regulation: "F-686",
        scenario: "You're reviewing infection data and notice the facility had 3 cases of C. diff in the past month but there's no evidence of enhanced surveillance, contact precautions, or outbreak investigation documentation.",
        question: "What are the most critical compliance failures in this scenario?",
        type: "open-ended",
        difficulty: "advanced",
        explanation: "Critical failures include: lack of outbreak investigation (3+ cases suggest possible outbreak), failure to implement enhanced surveillance, missing contact precautions, no antimicrobial stewardship review, insufficient environmental cleaning protocols, and lack of reporting to health authorities.",
        tips: [
          "3+ cases of the same infection may constitute an outbreak",
          "C. diff requires specific contact precautions and environmental protocols",
          "Outbreak investigations must be documented thoroughly",
          "Enhanced surveillance should be implemented immediately"
        ],
        commonMistakes: [
          "Not recognizing outbreak thresholds",
          "Inadequate contact precaution implementation", 
          "Missing environmental cleaning requirements",
          "Failure to report to authorities"
        ],
        timeLimit: 240,
        points: 25,
        tags: ["outbreak-response", "C-diff", "surveillance", "advanced"]
      }
    ]
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
    questions: [
      {
        id: "qapi-1",
        category: "Quality Improvement",
        regulation: "F-725",
        question: "What makes a QAPI program 'effective' according to F-725 requirements?",
        type: "multiple-choice",
        difficulty: "intermediate",
        options: [
          "Monthly meetings with basic quality measures",
          "Data-driven, comprehensive, with measurable objectives and systematic improvement",
          "Annual quality reviews and incident reporting",
          "Staff training and policy updates"
        ],
        correctAnswer: 1,
        explanation: "F-725 requires QAPI programs to be data-driven, comprehensive (covering all services), include measurable objectives, track progress, and use systematic approaches to improvement.",
        tips: [
          "QAPI must be systematic and data-driven",
          "All facility services must be included",
          "Objectives must be measurable with progress tracking",
          "Improvement activities should use evidence-based methods"
        ],
        commonMistakes: [
          "Having meetings without meaningful data analysis",
          "Focusing only on obvious quality issues",
          "Not including all departments/services",
          "Lacking measurable objectives"
        ],
        timeLimit: 90,
        points: 15,
        tags: ["QAPI-effectiveness", "systematic-improvement"]
      }
    ]
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
    questions: [
      {
        id: "rights-1",
        category: "Resident Rights",
        regulation: "F-550",
        question: "A resident requests to participate in social activities but family members object. What should the facility do?",
        scenario: "Mrs. Johnson, who has mild dementia but retains decision-making capacity, wants to join the facility's book club. Her adult daughter insists that her mother should stay in her room and not participate in group activities because 'it's not safe.'",
        type: "multiple-choice",
        difficulty: "intermediate",
        options: [
          "Follow the family's wishes to avoid conflict",
          "Support the resident's choice while addressing family concerns",
          "Require a physician's order before allowing participation",
          "Compromise by allowing limited participation only"
        ],
        correctAnswer: 1,
        explanation: "F-550 establishes that residents have the right to make choices about their care and daily activities. The facility must support the resident's autonomous decision while providing education to family members about the resident's rights.",
        tips: [
          "Resident autonomy takes precedence over family preferences when the resident has capacity",
          "Provide education to family members about resident rights",
          "Document the resident's decision-making capacity assessment",
          "Consider involving social services for family education"
        ],
        commonMistakes: [
          "Automatically deferring to family wishes",
          "Not assessing resident's decision-making capacity",
          "Failing to educate families about resident rights",
          "Not documenting the resident's autonomous choice"
        ],
        followUpQuestions: [
          "How would you assess decision-making capacity?",
          "What documentation would you need?",
          "How would you educate the family?"
        ],
        timeLimit: 150,
        points: 20,
        tags: ["autonomy", "family-dynamics", "decision-making"]
      },
      {
        id: "rights-2", 
        category: "Resident Rights",
        regulation: "F-580",
        question: "What are the key elements required for proper grievance handling in nursing homes?",
        type: "open-ended",
        difficulty: "advanced",
        explanation: "F-580 requires: immediate investigation of grievances, written acknowledgment within 24 hours, involvement of administrator or designee, thorough documentation, timely resolution (usually within 7-14 days), written response to complainant, follow-up to ensure satisfaction, and protection from retaliation.",
        tips: [
          "All grievances must be taken seriously regardless of source",
          "Timeline requirements are strict - document receipt immediately",
          "Administrator involvement shows facility commitment to resolution",
          "Anti-retaliation protection is crucial for resident trust"
        ],
        commonMistakes: [
          "Dismissing complaints as 'minor issues'",
          "Failing to meet timeline requirements",
          "Not involving appropriate leadership levels",
          "Inadequate documentation of investigation and resolution"
        ],
        timeLimit: 240,
        points: 25,
        tags: ["grievance-process", "investigation", "documentation"]
      }
    ]
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
    questions: [
      {
        id: "med-1",
        category: "Pharmacy",
        regulation: "F-760",
        scenario: "During medication administration, you notice that a resident has been receiving the same dose of a psychoactive medication for 6 months without any documented review or attempt at dose reduction.",
        question: "What is the primary compliance concern with this scenario?",
        type: "multiple-choice",
        difficulty: "advanced",
        options: [
          "The medication may not be properly stored",
          "There's no evidence of gradual dose reduction or medication review as required",
          "The resident may be experiencing side effects",
          "The pharmacy may not be providing adequate consultation"
        ],
        correctAnswer: 1,
        explanation: "F-760 requires facilities to attempt gradual dose reductions of psychoactive medications unless clinically contraindicated, with regular monitoring and documentation of attempts and outcomes.",
        tips: [
          "Gradual dose reduction (GDR) attempts are required unless contraindicated",
          "All psychoactive medications must be regularly reviewed",
          "Document clinical justification for continued use at same dose",
          "Involve physician, pharmacist, and nursing staff in medication reviews"
        ],
        commonMistakes: [
          "Assuming stable residents don't need medication reviews",
          "Not attempting dose reductions due to staff convenience",
          "Inadequate documentation of clinical justification",
          "Not involving interdisciplinary team in medication decisions"
        ],
        followUpQuestions: [
          "What would constitute a contraindication to dose reduction?",
          "How would you document a successful or unsuccessful GDR attempt?"
        ],
        timeLimit: 180,
        points: 25,
        tags: ["psychoactive-medications", "dose-reduction", "monitoring"]
      }
    ]
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
    questions: [
      {
        id: "diet-1",
        category: "Dietary",
        regulation: "F-812",
        question: "A resident has lost 8% of their body weight over the past 3 months. What immediate actions are required?",
        type: "multiple-choice",
        difficulty: "intermediate",
        options: [
          "Monitor for another month to establish a trend",
          "Immediately implement interventions and notify physician and family",
          "Increase meal portion sizes and document",
          "Schedule a dietary consultation for next week"
        ],
        correctAnswer: 1,
        explanation: "F-812 requires immediate intervention for significant weight loss (5% in 30 days or 10% in 180 days). 8% in 3 months represents significant weight loss requiring immediate physician notification and intervention implementation.",
        tips: [
          "5% weight loss in 30 days or 10% in 180 days triggers immediate action",
          "Interventions should be implemented before waiting for physician orders when clinically appropriate",
          "Family notification is required for significant changes",
          "Documentation must include specific interventions and monitoring plan"
        ],
        commonMistakes: [
          "Waiting too long to implement interventions",
          "Not recognizing significant weight loss thresholds",
          "Failing to notify physician and family promptly",
          "Inadequate intervention implementation"
        ],
        timeLimit: 120,
        points: 20,
        tags: ["weight-loss", "interventions", "monitoring"]
      }
    ]
  }
];

export default function MockSurveyTrainingPage() {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [currentProgress, setCurrentProgress] = useState<UserProgress | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "training" | "leaderboard">("dashboard");

  // Timer for current question
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Time's up - auto-submit current answer
      handleNextQuestion();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Start training session
  const startSession = (session: TrainingSession) => {
    setSelectedSession(session);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setSessionComplete(false);
    setShowResults(false);
    setSessionStartTime(Date.now());
    setQuestionStartTime(Date.now());
    
    const firstQuestion = session.questions[0];
    setTimeLeft(firstQuestion.timeLimit || 120);
    setIsActive(true);

    const progress: UserProgress = {
      sessionId: session.id,
      currentQuestionIndex: 0,
      answers: {},
      score: 0,
      timeSpent: 0,
      startedAt: new Date().toISOString()
    };
    setCurrentProgress(progress);
  };

  // Handle answer submission
  const submitAnswer = () => {
    if (!selectedSession || !currentProgress) return;

    const currentQuestion = selectedSession.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer || 
      (currentQuestion.type === 'open-ended' && selectedAnswer?.trim().length > 10);

    const newAnswers = {
      ...currentProgress.answers,
      [currentQuestion.id]: {
        answer: selectedAnswer,
        correct: isCorrect,
        timeSpent: Date.now() - questionStartTime,
        points: isCorrect ? currentQuestion.points : 0
      }
    };

    const newScore = Object.values(newAnswers).reduce((total, ans: any) => total + (ans.points || 0), 0);

    setCurrentProgress({
      ...currentProgress,
      answers: newAnswers,
      score: newScore
    });

    setShowExplanation(true);
    setIsActive(false);
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (!selectedSession) return;

    if (currentQuestionIndex < selectedSession.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
      
      const nextQuestion = selectedSession.questions[nextIndex];
      setTimeLeft(nextQuestion.timeLimit || 120);
      setIsActive(true);
    } else {
      // Session complete
      completeSession();
    }
  };

  // Complete training session
  const completeSession = () => {
    if (!currentProgress || !selectedSession) return;

    const totalTime = Date.now() - sessionStartTime;
    const finalScore = currentProgress.score;
    const maxScore = selectedSession.questions.reduce((total, q) => total + q.points, 0);
    const percentage = Math.round((finalScore / maxScore) * 100);
    const passed = percentage >= selectedSession.passingScore;

    setCurrentProgress({
      ...currentProgress,
      timeSpent: totalTime,
      completedAt: new Date().toISOString(),
      passed
    });

    setSessionComplete(true);
    setShowResults(true);
    setIsActive(false);
  };

  // Reset session
  const resetSession = () => {
    setSelectedSession(null);
    setCurrentProgress(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setSessionComplete(false);
    setShowResults(false);
    setIsActive(false);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current question
  const currentQuestion = selectedSession?.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8 scrollable">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mock Survey Training</h1>
              <p className="text-gray-600 mt-1">Interactive CMS survey preparation with real-world scenarios</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Practice Sessions</div>
                <div className="text-2xl font-bold text-blue-600">{trainingSessions.length}</div>
              </div>
              {selectedSession && (
                <button
                  onClick={resetSession}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Training
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {!selectedSession && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mt-4">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'training', label: 'Training Sessions', icon: BookOpen },
                { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard Tab */}
        {!selectedSession && activeTab === 'dashboard' && (
          <TrainingDashboard userId={user?.id} />
        )}

        {/* Training Sessions Tab */}
        {!selectedSession && activeTab === 'training' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {trainingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {session.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {session.description}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      session.difficulty === 'beginner' 
                        ? 'bg-green-100 text-green-700'
                        : session.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {session.difficulty}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>{session.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText size={14} />
                      <span>{session.questions.length} questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Target size={14} />
                      <span>{session.passingScore}% to pass</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award size={14} />
                      <span>{session.questions.reduce((total, q) => total + q.points, 0)} points total</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {session.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                    {session.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        +{session.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => startSession(session)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Play size={16} />
                    Start Training
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {!selectedSession && activeTab === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Training Leaderboard</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw size={14} />
                  Updated 5 minutes ago
                </div>
              </div>
              <p className="text-gray-600 mt-1">Top performers across all training sessions</p>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Trophy className="text-yellow-600 mx-auto mb-2" size={32} />
                  <div className="text-lg font-bold text-yellow-900">Sarah Johnson</div>
                  <div className="text-yellow-700">Pine Valley Care</div>
                  <div className="text-sm text-yellow-600 mt-1">96% Average</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Award className="text-gray-600 mx-auto mb-2" size={32} />
                  <div className="text-lg font-bold text-gray-900">Michael Chen</div>
                  <div className="text-gray-700">Riverside Manor</div>
                  <div className="text-sm text-gray-600 mt-1">94% Average</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Star className="text-orange-600 mx-auto mb-2" size={32} />
                  <div className="text-lg font-bold text-orange-900">Lisa Martinez</div>
                  <div className="text-orange-700">Sunset Gardens</div>
                  <div className="text-sm text-orange-600 mt-1">93% Average</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Facility</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Sessions</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Average</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Certificates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { rank: 1, name: "Sarah Johnson", facility: "Pine Valley Care", sessions: 6, average: 96, certificates: 6 },
                      { rank: 2, name: "Michael Chen", facility: "Riverside Manor", sessions: 6, average: 94, certificates: 5 },
                      { rank: 3, name: "Lisa Martinez", facility: "Sunset Gardens", sessions: 5, average: 93, certificates: 5 },
                      { rank: 4, name: "David Wilson", facility: "Oakwood Nursing", sessions: 4, average: 91, certificates: 4 },
                      { rank: 5, name: "Jennifer Davis", facility: "Maple Heights", sessions: 6, average: 90, certificates: 6 },
                      { rank: 6, name: "Robert Taylor", facility: "Garden View", sessions: 3, average: 89, certificates: 3 },
                      { rank: 7, name: "Amanda Brown", facility: "Hillcrest Manor", sessions: 5, average: 88, certificates: 4 },
                      { rank: 8, name: "James Anderson", facility: "Willow Creek", sessions: 4, average: 87, certificates: 4 }
                    ].map((participant) => (
                      <tr key={participant.rank} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              participant.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                              participant.rank === 2 ? 'bg-gray-100 text-gray-700' :
                              participant.rank === 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {participant.rank}
                            </span>
                            {participant.rank <= 3 && (
                              <Trophy size={14} className={
                                participant.rank === 1 ? 'text-yellow-500' :
                                participant.rank === 2 ? 'text-gray-500' :
                                'text-orange-500'
                              } />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{participant.name}</td>
                        <td className="py-3 px-4 text-gray-600">{participant.facility}</td>
                        <td className="py-3 px-4 text-gray-600">{participant.sessions}</td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${
                            participant.average >= 95 ? 'text-green-600' :
                            participant.average >= 90 ? 'text-blue-600' :
                            participant.average >= 85 ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {participant.average}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Award size={14} className="text-purple-500" />
                            <span className="text-purple-600 font-medium">{participant.certificates}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Training Interface */}
        {selectedSession && !showResults && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Question Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border">
                {/* Question Header */}
                <div className="border-b bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        Question {currentQuestionIndex + 1} of {selectedSession.questions.length}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-md">
                        {currentQuestion?.regulation}
                      </span>
                      <span className={`px-3 py-1 text-sm rounded-md ${
                        currentQuestion?.difficulty === 'basic' 
                          ? 'bg-green-100 text-green-700'
                          : currentQuestion?.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {currentQuestion?.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Award size={14} />
                        {currentQuestion?.points} pts
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        timeLeft <= 30 ? 'text-red-600' : timeLeft <= 60 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        <Timer size={14} />
                        {formatTime(timeLeft)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Scenario */}
                  {currentQuestion?.scenario && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <Eye size={16} />
                        Survey Scenario
                      </h4>
                      <p className="text-amber-800">{currentQuestion.scenario}</p>
                    </div>
                  )}

                  {/* Question */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {currentQuestion?.question}
                    </h3>

                    {/* Multiple Choice Options */}
                    {currentQuestion?.type === 'multiple-choice' && (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedAnswer(index)}
                            disabled={showExplanation}
                            className={`w-full p-4 text-left border rounded-lg transition-colors ${
                              selectedAnswer === index
                                ? showExplanation
                                  ? index === currentQuestion.correctAnswer
                                    ? 'bg-green-50 border-green-300 text-green-900'
                                    : 'bg-red-50 border-red-300 text-red-900'
                                  : 'bg-blue-50 border-blue-300 text-blue-900'
                                : showExplanation && index === currentQuestion.correctAnswer
                                ? 'bg-green-50 border-green-300 text-green-900'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            } ${showExplanation ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedAnswer === index
                                  ? showExplanation
                                    ? index === currentQuestion.correctAnswer
                                      ? 'bg-green-500 border-green-500'
                                      : 'bg-red-500 border-red-500'
                                    : 'bg-blue-500 border-blue-500'
                                  : showExplanation && index === currentQuestion.correctAnswer
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {(selectedAnswer === index || (showExplanation && index === currentQuestion.correctAnswer)) && (
                                  <CheckCircle size={14} className="text-white" />
                                )}
                                {showExplanation && selectedAnswer === index && index !== currentQuestion.correctAnswer && (
                                  <XCircle size={14} className="text-white" />
                                )}
                              </div>
                              <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Open Ended */}
                    {currentQuestion?.type === 'open-ended' && (
                      <textarea
                        value={selectedAnswer || ''}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        disabled={showExplanation}
                        placeholder="Provide your detailed answer here..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32 disabled:bg-gray-50 disabled:cursor-default"
                      />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <div>
                      {currentQuestionIndex > 0 && (
                        <button
                          onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <ArrowLeft size={16} />
                          Previous
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {!showExplanation ? (
                        <button
                          onClick={submitAnswer}
                          disabled={!selectedAnswer || (currentQuestion?.type === 'open-ended' && (!selectedAnswer || selectedAnswer.trim().length < 10))}
                          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <button
                          onClick={handleNextQuestion}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          {currentQuestionIndex === selectedSession.questions.length - 1 ? 'Complete Session' : 'Next Question'}
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Explanation */}
                  {showExplanation && currentQuestion && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <BookOpen size={16} />
                            Explanation
                          </h4>
                          <p className="text-gray-700">{currentQuestion.explanation}</p>
                        </div>

                        <div>
                          <h5 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Key Tips
                          </h5>
                          <ul className="space-y-1">
                            {currentQuestion.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0"></div>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Common Mistakes
                          </h5>
                          <ul className="space-y-1">
                            {currentQuestion.commonMistakes.map((mistake, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {currentQuestion.followUpQuestions && (
                          <div>
                            <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                              <MessageSquare size={14} />
                              Follow-up Questions to Consider
                            </h5>
                            <ul className="space-y-1">
                              {currentQuestion.followUpQuestions.map((question, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                                  {question}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Session Progress</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Questions</span>
                      <span>{currentQuestionIndex + 1} / {selectedSession.questions.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${((currentQuestionIndex + 1) / selectedSession.questions.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Score</span>
                    <span className="font-medium">{currentProgress?.score || 0} pts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Time Elapsed</span>
                    <span>{formatTime(Math.floor((Date.now() - sessionStartTime) / 1000))}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Question Overview</h4>
                <div className="grid grid-cols-5 gap-2">
                  {selectedSession.questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                        index < currentQuestionIndex
                          ? 'bg-green-500 text-white'
                          : index === currentQuestionIndex
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Session Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Passing Score</span>
                    <span>{selectedSession.passingScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Points</span>
                    <span>{selectedSession.questions.reduce((total, q) => total + q.points, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Difficulty</span>
                    <span className="capitalize">{selectedSession.difficulty}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {showResults && currentProgress && selectedSession && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                currentProgress.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {currentProgress.passed ? (
                  <Award className="text-green-600" size={40} />
                ) : (
                  <XCircle className="text-red-600" size={40} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentProgress.passed ? 'Congratulations!' : 'Training Complete'}
              </h2>
              <p className="text-gray-600">
                {currentProgress.passed 
                  ? 'You have successfully completed this training session.'
                  : 'Review the feedback and try again to improve your score.'
                }
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {Math.round((currentProgress.score / selectedSession.questions.reduce((total, q) => total + q.points, 0)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Final Score</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {Object.values(currentProgress.answers).filter((ans: any) => ans.correct).length}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {formatTime(Math.floor(currentProgress.timeSpent / 1000))}
                </div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetSession}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Sessions
              </button>
              <button
                onClick={() => startSession(selectedSession)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw size={16} />
                Retry Session
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download size={16} />
                Download Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}