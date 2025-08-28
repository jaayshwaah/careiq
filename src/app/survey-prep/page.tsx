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
  BarChart3
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

  const mockSurveyHistory = [
    { date: '2023-03-15', type: 'Standard', deficiencies: 3, level: 'G', score: 'Above Average' },
    { date: '2022-08-20', type: 'Complaint', deficiencies: 1, level: 'E', score: 'Much Above Average' },
    { date: '2021-11-10', type: 'Standard', deficiencies: 7, level: 'F', score: 'Average' }
  ];

  useEffect(() => {
    // Load saved progress
    const savedProgress = localStorage.getItem('survey-prep-progress');
    if (savedProgress) {
      const data = JSON.parse(savedProgress);
      setCheckedItems(new Set(data.checkedItems || []));
      setNotes(data.notes || {});
      setTeamAssignments(data.teamAssignments || {});
    }
  }, []);

  const saveProgress = () => {
    const data = {
      checkedItems: Array.from(checkedItems),
      notes,
      teamAssignments,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('survey-prep-progress', JSON.stringify(data));
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Survey Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Survey Type</label>
            <select
              value={selectedSurveyType}
              onChange={(e) => setSelectedSurveyType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {surveyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {surveyTypes.find(t => t.value === selectedSurveyType)?.description}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Facility Type</label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {facilityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {facilityTypes.find(t => t.value === facilityType)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Survey Date</label>
            <input
              type="date"
              value={surveyDate}
              onChange={(e) => setSurveyDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Preparation Progress</h2>
          <div className="flex gap-2">
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.completedItems}/{stats.totalItems}</div>
            <div className="text-sm text-gray-600">Tasks Complete</div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(stats.completedItems / stats.totalItems) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{stats.completedCritical}/{stats.criticalItems}</div>
            <div className="text-sm text-red-600">Critical Items</div>
            <div className="mt-2 bg-red-200 rounded-full h-2">
              <div
                className="bg-red-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(stats.completedCritical / stats.criticalItems) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {Math.round((stats.completedItems / stats.totalItems) * 100)}%
            </div>
            <div className="text-sm text-green-600">Overall Progress</div>
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
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Calendar className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <div className="text-sm text-blue-600">Survey Ready</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.completedCritical === stats.criticalItems ? 'All critical items complete' : 'Complete critical items'}
            </div>
          </div>
        </div>

        {/* Readiness Assessment */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Readiness Assessment</h3>
          <div className="space-y-2">
            {stats.completedCritical === stats.criticalItems ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm">All critical requirements completed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{stats.criticalItems - stats.completedCritical} critical items remain</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-600">
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

      {/* Survey History */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Previous Survey History</h2>
        <div className="space-y-3">
          {mockSurveyHistory.map((survey, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
          <div key={sectionKey} className="bg-white rounded-lg shadow-sm border">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection(sectionKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SectionIcon className={`h-5 w-5 text-${section.color}-600`} />
                  <h3 className="font-semibold">{section.title}</h3>
                  <span className="text-sm text-gray-500">
                    ({sectionCompleted}/{sectionTotal})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${section.color}-600 rounded-full h-2 transition-all duration-300`}
                  style={{ width: `${(sectionCompleted / sectionTotal) * 100}%` }}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="border-t p-4 space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          checkedItems.has(item.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {checkedItems.has(item.id) && <CheckSquare className="h-3 w-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`font-medium ${checkedItems.has(item.id) ? 'line-through text-gray-500' : ''}`}>
                              {item.task}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.critical && (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                  Critical
                                </span>
                              )}
                              {item.ftag && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {item.ftag}
                                </span>
                              )}
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {item.timeRequired}
                              </span>
                            </div>
                          </div>
                          
                          <div className="ml-4 min-w-0 w-32">
                            <select
                              value={teamAssignments[item.id] || item.responsible || ''}
                              onChange={(e) => updateAssignment(item.id, e.target.value)}
                              className="text-xs border rounded px-2 py-1 w-full"
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
                            className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Team Assignments</h2>
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
              <div key={role} className="border rounded-lg p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  {role}
                  <span className="text-sm text-gray-500">({assignments.length} tasks)</span>
                </h3>
                
                {assignedItems.length > 0 ? (
                  <ul className="space-y-2">
                    {assignedItems.map(item => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${
                          checkedItems.has(item.id) ? 'bg-green-500' : 
                          item.critical ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <span className={checkedItems.has(item.id) ? 'line-through text-gray-500' : ''}>
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
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Survey Preparation Assistant</h1>
        <p className="text-purple-100">
          Comprehensive checklist and team coordination for regulatory survey readiness.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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