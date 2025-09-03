"use client";
import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertTriangle, 
  FileCheck, 
  Users, 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  Download,
  Share,
  Clock,
  Target,
  Zap,
  BookOpen,
  Shield,
  Building2,
  Activity,
  MessageSquare,
  Bell,
  TrendingUp,
  Award,
  Eye,
  Plus,
  Settings,
  BarChart3,
  Play,
  Timer
} from 'lucide-react';

const SurveyPreparation = () => {
  const [activeTab, setActiveTab] = useState('checklist');
  const [selectedSurveyType, setSelectedSurveyType] = useState('Standard');
  const [facilityType, setFacilityType] = useState('SNF');
  const [surveyDate, setSurveyDate] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(['documentation']));
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [notes, setNotes] = useState({});
  const [teamAssignments, setTeamAssignments] = useState({});

  const surveyTypes = [
    { value: 'Standard', label: 'Standard Survey', description: 'Regular recertification survey', duration: '5-7 days' },
    { value: 'Complaint', label: 'Complaint Survey', description: 'Investigation of specific complaints', duration: '1-3 days' },
    { value: 'Revisit', label: 'Revisit Survey', description: 'Follow-up on previous citations', duration: '1-2 days' },
    { value: 'Change of Ownership', label: 'Change of Ownership', description: 'New ownership certification', duration: '3-5 days' },
    { value: 'Initial', label: 'Initial Survey', description: 'New facility certification', duration: '7-10 days' }
  ];

  const facilityTypes = [
    { value: 'SNF', label: 'Skilled Nursing Facility', description: 'Medicare certified' },
    { value: 'NF', label: 'Nursing Facility', description: 'Medicaid certified' },
    { value: 'Dual-Certified', label: 'Dual Certified', description: 'Medicare & Medicaid' },
    { value: 'ICF/IID', label: 'ICF/IID', description: 'Intermediate Care Facility' }
  ];

  const teamRoles = [
    'Administrator',
    'Director of Nursing',
    'Assistant Director of Nursing', 
    'Social Services Director',
    'Activities Director',
    'Dietary Manager',
    'Maintenance Director',
    'Medical Director',
    'Quality Assurance Coordinator'
  ];

  const prepSections = {
    documentation: {
      title: 'Documentation & Records',
      icon: FileCheck,
      color: 'blue',
      items: [
        { 
          id: 'policies', 
          task: 'Review and update all facility policies (within 3 years)', 
          critical: true,
          ftag: 'F880',
          description: 'Ensure all policies are current, approved, and implemented',
          timeRequired: '4-8 hours',
          responsible: 'Administrator'
        },
        { 
          id: 'qapi', 
          task: 'Ensure QAPI plan is current and being implemented', 
          critical: true,
          ftag: 'F865',
          description: 'Review QAPI committee meetings, performance measures, and action plans',
          timeRequired: '2-4 hours',
          responsible: 'Quality Assurance Coordinator'
        },
        { 
          id: 'staffing', 
          task: 'Verify staffing records and PBJ submissions are accurate', 
          critical: true,
          ftag: 'F725',
          description: 'Check staffing levels, schedules, and payroll-based journal reports',
          timeRequired: '3-6 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'training', 
          task: 'Confirm all staff have completed required training', 
          critical: false,
          ftag: 'F730',
          description: 'Verify orientation, continuing education, and competency testing',
          timeRequired: '2-3 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'licenses', 
          task: 'Check all professional licenses are current', 
          critical: true,
          ftag: 'F725',
          description: 'Verify nurse licenses, administrator license, and other certifications',
          timeRequired: '1-2 hours',
          responsible: 'Administrator'
        },
        { 
          id: 'contracts', 
          task: 'Review medical director and consultant agreements', 
          critical: false,
          ftag: 'F740',
          description: 'Ensure current contracts and adequate coverage',
          timeRequired: '1 hour',
          responsible: 'Administrator'
        }
      ]
    },
    clinical: {
      title: 'Clinical Care & Quality',
      icon: Users,
      color: 'green',
      items: [
        { 
          id: 'care-plans', 
          task: 'Review resident care plans for completeness', 
          critical: true,
          ftag: 'F656',
          description: 'Audit care plans for accuracy, signatures, and implementation',
          timeRequired: '6-10 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'mds-accuracy', 
          task: 'Audit recent MDS assessments for accuracy', 
          critical: true,
          ftag: 'F636',
          description: 'Review MDS assessments, care area assessments, and triggers',
          timeRequired: '4-6 hours',
          responsible: 'MDS Coordinator'
        },
        { 
          id: 'medication', 
          task: 'Check medication administration records (MAR)', 
          critical: true,
          ftag: 'F760',
          description: 'Review MAR accuracy, pharmacy services, and medication errors',
          timeRequired: '3-5 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'incident-reports', 
          task: 'Review incident/accident reporting procedures', 
          critical: false,
          ftag: 'F600',
          description: 'Check incident reports, investigations, and follow-up actions',
          timeRequired: '2-3 hours',
          responsible: 'Quality Assurance Coordinator'
        },
        { 
          id: 'infection-control', 
          task: 'Ensure infection control policies are being followed', 
          critical: true,
          ftag: 'F880',
          description: 'Review infection control practices, surveillance, and reporting',
          timeRequired: '2-4 hours',
          responsible: 'Infection Control Nurse'
        },
        { 
          id: 'wound-care', 
          task: 'Review wound care documentation and outcomes', 
          critical: false,
          ftag: 'F686',
          description: 'Audit wound assessments, treatments, and healing progress',
          timeRequired: '2-3 hours',
          responsible: 'Director of Nursing'
        }
      ]
    },
    environment: {
      title: 'Environment & Life Safety',
      icon: AlertTriangle,
      color: 'red',
      items: [
        { 
          id: 'fire-safety', 
          task: 'Test fire alarm systems and check extinguishers', 
          critical: true,
          ftag: 'K-tags',
          description: 'Conduct fire drills, test alarms, inspect extinguishers and exits',
          timeRequired: '2-3 hours',
          responsible: 'Maintenance Director'
        },
        { 
          id: 'emergency-prep', 
          task: 'Review emergency preparedness plan and supplies', 
          critical: true,
          ftag: 'F838',
          description: 'Check emergency plans, supplies, communication systems, and training',
          timeRequired: '2-4 hours',
          responsible: 'Administrator'
        },
        { 
          id: 'housekeeping', 
          task: 'Deep clean common areas and resident rooms', 
          critical: false,
          ftag: 'F880',
          description: 'Ensure facility cleanliness and sanitation standards',
          timeRequired: '8-12 hours',
          responsible: 'Housekeeping Supervisor'
        },
        { 
          id: 'maintenance', 
          task: 'Complete preventive maintenance checklist', 
          critical: false,
          ftag: 'F880',
          description: 'Check HVAC, plumbing, electrical, and equipment functionality',
          timeRequired: '4-6 hours',
          responsible: 'Maintenance Director'
        },
        { 
          id: 'dietary', 
          task: 'Review kitchen sanitation and food safety practices', 
          critical: true,
          ftag: 'F812',
          description: 'Audit food storage, preparation, serving, and temperature logs',
          timeRequired: '3-4 hours',
          responsible: 'Dietary Manager'
        }
      ]
    },
    staffing: {
      title: 'Staffing & Operations',
      icon: Users,
      color: 'purple',
      items: [
        { 
          id: 'staffing-levels', 
          task: 'Ensure adequate staffing per CMS requirements', 
          critical: true,
          ftag: 'F725',
          description: 'Verify RN coverage 24/7 and adequate staffing ratios',
          timeRequired: '2-3 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'staff-meetings', 
          task: 'Hold pre-survey staff meetings and training', 
          critical: false,
          ftag: 'F730',
          description: 'Brief all staff on survey process and expectations',
          timeRequired: '3-4 hours',
          responsible: 'Administrator'
        },
        { 
          id: 'assignments', 
          task: 'Designate staff roles during survey', 
          critical: false,
          description: 'Assign survey liaisons and backup coverage',
          timeRequired: '1-2 hours',
          responsible: 'Administrator'
        },
        { 
          id: 'communication', 
          task: 'Review resident/family communication logs', 
          critical: false,
          ftag: 'F622',
          description: 'Check grievance procedures and family notifications',
          timeRequired: '2-3 hours',
          responsible: 'Social Services Director'
        }
      ]
    },
    residents: {
      title: 'Resident Care & Rights',
      icon: Activity,
      color: 'indigo',
      items: [
        { 
          id: 'dignity-respect', 
          task: 'Review resident rights and dignity practices', 
          critical: true,
          ftag: 'F550-F584',
          description: 'Audit resident choice, privacy, and dignity practices',
          timeRequired: '3-4 hours',
          responsible: 'Social Services Director'
        },
        { 
          id: 'activities', 
          task: 'Ensure activities program meets resident needs', 
          critical: false,
          ftag: 'F740',
          description: 'Review activity assessments, programs, and participation',
          timeRequired: '2-3 hours',
          responsible: 'Activities Director'
        },
        { 
          id: 'restraints', 
          task: 'Review restraint use and alternatives', 
          critical: true,
          ftag: 'F700',
          description: 'Audit physical and chemical restraint policies and usage',
          timeRequired: '2-4 hours',
          responsible: 'Director of Nursing'
        },
        { 
          id: 'discharge-planning', 
          task: 'Review discharge planning processes', 
          critical: false,
          ftag: 'F622',
          description: 'Check discharge planning documentation and coordination',
          timeRequired: '2-3 hours',
          responsible: 'Social Services Director'
        }
      ]
    }
  };

  // Survey history will be loaded from the database in future implementation
  const [surveyHistory, setSurveyHistory] = useState([]);

  useEffect(() => {
    // Load from API, fall back to localStorage
    const load = async () => {
      try {
        const params = new URLSearchParams({ surveyType: selectedSurveyType, facilityType });
        const res = await fetch(`/api/survey-prep?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.progress) setCheckedItems(new Set(Object.keys(json.progress).filter((k) => json.progress[k])));
          if (json?.notes) setNotes(json.notes);
          if (json?.assignments) setTeamAssignments(json.assignments);
        } else {
          const saved = localStorage.getItem('survey-prep-progress');
          if (saved) {
            const data = JSON.parse(saved);
            setCheckedItems(new Set(data.checkedItems || []));
            setNotes(data.notes || {});
            setTeamAssignments(data.teamAssignments || {});
          }
        }
      } catch (e) {
        const saved = localStorage.getItem('survey-prep-progress');
        if (saved) {
          const data = JSON.parse(saved);
          setCheckedItems(new Set(data.checkedItems || []));
          setNotes(data.notes || {});
          setTeamAssignments(data.teamAssignments || {});
        }
      }
    };
    load();
  }, []);

  const saveProgress = () => {
    const data = {
      checkedItems: Array.from(checkedItems),
      notes,
      teamAssignments,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('survey-prep-progress', JSON.stringify(data));
    // Also send to API (debounced by outer useEffect)
    saveToServer();
  };

  let saveTimer: any = null as any;
  const saveToServer = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const checklistData = Object.fromEntries(Array.from(checkedItems).map((id) => [id, true]));
        await fetch('/api/survey-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checklistData,
            surveyType: selectedSurveyType,
            facilityType,
            notes,
            assignments: teamAssignments,
          }),
        });
      } catch (e) {
        // silent fail; localStorage acts as fallback
      }
    }, 500);
  };

  useEffect(() => {
    const timer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timer);
  }, [checkedItems, notes, teamAssignments]);

  const toggleSection = (sectionKey) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const toggleItem = (itemId) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const updateNote = (itemId, note) => {
    setNotes(prev => ({ ...prev, [itemId]: note }));
  };

  const updateAssignment = (itemId, assignee) => {
    setTeamAssignments(prev => ({ ...prev, [itemId]: assignee }));
  };

  const getCompletionStats = () => {
    const totalItems = Object.values(prepSections).reduce((sum, section) => sum + section.items.length, 0);
    const completedItems = checkedItems.size;
    const criticalItems = Object.values(prepSections).reduce((sum, section) => 
      sum + section.items.filter(item => item.critical).length, 0
    );
    const completedCritical = Object.values(prepSections).reduce((sum, section) => 
      sum + section.items.filter(item => item.critical && checkedItems.has(item.id)).length, 0
    );
    
    return { totalItems, completedItems, criticalItems, completedCritical };
  };

  const getDaysUntilSurvey = () => {
    if (!surveyDate) return null;
    const today = new Date();
    const survey = new Date(surveyDate);
    const diffTime = survey - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const stats = getCompletionStats();
  const daysUntil = getDaysUntilSurvey();

  const generatePDF = async () => {
    // Mock PDF generation
    alert('PDF generation would be implemented here with all checklist items, assignments, and notes');
  };

  const shareChecklist = async () => {
    // Mock sharing functionality
    alert('Sharing functionality would allow email distribution to team members');
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Survey Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Survey Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Survey Type</label>
            <select
              value={selectedSurveyType}
              onChange={(e) => setSelectedSurveyType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {surveyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {surveyTypes.find(t => t.value === selectedSurveyType)?.description}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Facility Type</label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {facilityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {facilityTypes.find(t => t.value === facilityType)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Survey Date</label>
            <input
              type="date"
              value={surveyDate}
              onChange={(e) => setSurveyDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {daysUntil !== null && (
              <p className={`text-xs mt-1 ${daysUntil < 7 ? 'text-red-600' : daysUntil < 14 ? 'text-orange-600' : 'text-green-600'}`}>
                {daysUntil > 0 ? `${daysUntil} days until survey` : daysUntil === 0 ? 'Survey is today!' : `Survey was ${Math.abs(daysUntil)} days ago`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preparation Progress</h2>
          <div className="flex gap-2">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={shareChecklist}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Share className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.completedItems}/{stats.totalItems}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Complete</div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(stats.completedItems / stats.totalItems) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.completedCritical}/{stats.criticalItems}</div>
            <div className="text-sm text-red-600 dark:text-red-400">Critical Items</div>
            <div className="mt-2 bg-red-200 dark:bg-red-800 rounded-full h-2">
              <div
                className="bg-red-600 dark:bg-red-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(stats.completedCritical / stats.criticalItems) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {Math.round((stats.completedItems / stats.totalItems) * 100)}%
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Overall Progress</div>
            <div className="flex items-center justify-center mt-2">
              {Math.round((stats.completedItems / stats.totalItems) * 100) >= 80 ? (
                <Award className="h-5 w-5 text-green-600" />
              ) : Math.round((stats.completedItems / stats.totalItems) * 100) >= 60 ? (
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              ) : (
                <Target className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="h-6 w-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-600 dark:text-blue-400">Survey Ready</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.completedCritical === stats.criticalItems ? 'All critical items complete' : 'Complete critical items'}
            </div>
          </div>
        </div>

        {/* Readiness Assessment */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Readiness Assessment</h3>
          <div className="space-y-2">
            {stats.completedCritical === stats.criticalItems ? (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm">All critical requirements completed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{stats.criticalItems - stats.completedCritical} critical items remain</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Estimated {Object.values(prepSections).reduce((total, section) => 
                  total + section.items.filter(item => !checkedItems.has(item.id)).length, 0
                )} hours of work remaining
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mock Survey Training */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Mock Survey Q&A Training</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Practice survey scenarios and test your knowledge with interactive questions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Last Score</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">85%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <div className="font-semibold text-blue-900 dark:text-blue-100">200+</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Practice Questions</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <Target className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <div className="font-semibold text-green-900 dark:text-green-100">F-Tag</div>
            <div className="text-xs text-green-600 dark:text-green-400">Specific Scenarios</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Award className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <div className="font-semibold text-purple-900 dark:text-purple-100">Real-time</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Feedback & Tips</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Quick Practice Session</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Answer 10 random questions covering common survey scenarios</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> ~15 minutes</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> All difficulty levels</span>
                </div>
              </div>
              <a
                href="/mock-survey-training?mode=quick"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Play className="h-4 w-4" />
                Start Practice
              </a>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Full Mock Survey</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Complete 50-question mock survey with detailed explanations</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> ~60 minutes</span>
                  <span className="flex items-center gap-1"><Award className="h-3 w-3" /> Comprehensive review</span>
                </div>
              </div>
              <a
                href="/mock-survey-training?mode=full"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <BookOpen className="h-4 w-4" />
                Start Survey
              </a>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Focus Areas</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Target specific F-tags or areas where your facility needs improvement</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Customizable topics</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Progress tracking</span>
                </div>
              </div>
              <a
                href="/mock-survey-training?mode=focus"
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Target className="h-4 w-4" />
                Choose Focus
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Survey History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Previous Survey History</h2>
        {surveyHistory.length > 0 ? (
          <div className="space-y-3">
            {surveyHistory.map((survey, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    survey.level === 'G' ? 'bg-red-500' :
                    survey.level === 'F' ? 'bg-orange-500' :
                    survey.level === 'E' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <span className="font-medium">{survey.type} Survey</span>
                    <span className="text-gray-500 ml-2">{new Date(survey.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{survey.deficiencies} Deficiencies</div>
                  <div className="text-xs text-gray-500">{survey.score}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="mb-2">📋</div>
            <p className="text-sm">No survey history available</p>
            <p className="text-xs mt-1">Survey history will be displayed here when available from your facility records</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderChecklistTab = () => (
    <div className="space-y-4">
      {Object.entries(prepSections).map(([sectionKey, section]) => {
        const sectionCompleted = section.items.filter(item => checkedItems.has(item.id)).length;
        const sectionTotal = section.items.length;
        const isExpanded = expandedSections.has(sectionKey);
        const SectionIcon = section.icon;
        
        return (
          <div key={sectionKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection(sectionKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SectionIcon className={`h-5 w-5 text-${section.color}-600`} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{section.title}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({sectionCompleted}/{sectionTotal})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className={`bg-${section.color}-600 rounded-full h-2 transition-all duration-300`}
                  style={{ width: `${(sectionCompleted / sectionTotal) * 100}%` }}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-600 p-4 space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          checkedItems.has(item.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500'
                        }`}
                      >
                        {checkedItems.has(item.id) && <CheckSquare className="h-3 w-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`font-medium ${checkedItems.has(item.id) ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {item.task}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.critical && (
                                <span className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                  Critical
                                </span>
                              )}
                              {item.ftag && (
                                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                                  {item.ftag}
                                </span>
                              )}
                              <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                {item.timeRequired}
                              </span>
                            </div>
                          </div>
                          
                          <div className="ml-4 min-w-0 w-32">
                            <select
                              value={teamAssignments[item.id] || item.responsible || ''}
                              onChange={(e) => updateAssignment(item.id, e.target.value)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Assign to...</option>
                              {teamRoles.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <textarea
                            placeholder="Add notes, progress updates, or specific instructions..."
                            value={notes[item.id] || ''}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Team Assignments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamRoles.map(role => {
            const assignments = Object.entries(teamAssignments).filter(([_, assignee]) => assignee === role);
            const assignedItems = assignments.map(([itemId]) => {
              const item = Object.values(prepSections)
                .flatMap(section => section.items)
                .find(item => item.id === itemId);
              return item;
            }).filter(Boolean);

            return (
              <div key={role} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3 text-gray-900 dark:text-gray-100">
                  <Users className="h-4 w-4" />
                  {role}
                  <span className="text-sm text-gray-500 dark:text-gray-400">({assignments.length} tasks)</span>
                </h3>
                
                {assignedItems.length > 0 ? (
                  <ul className="space-y-2">
                    {assignedItems.map(item => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${
                          checkedItems.has(item.id) ? 'bg-green-500' : 
                          item.critical ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <span className={checkedItems.has(item.id) ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
                          {item.task}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No tasks assigned</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Survey Preparation</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              Comprehensive checklist and team coordination for regulatory survey readiness
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>Regulatory Compliance</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Team Coordination</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                <span>Progress Tracking</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round((checkedItems.size / 45) * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'checklist', label: 'Preparation Checklist', icon: CheckSquare },
            { id: 'team', label: 'Team Assignments', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'checklist' && renderChecklistTab()}
      {activeTab === 'team' && renderTeamTab()}
    </div>
  );
};

export default SurveyPreparation;
