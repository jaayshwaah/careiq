"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  BookOpen,
  Users,
  FileText,
  Heart,
  Shield,
  Building,
  Pill,
  Activity,
  Brain,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Star,
  AlertCircle,
  Info,
  Download,
  Plus
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ComplianceAlerts from "@/components/ComplianceAlerts";

interface ComplianceRegulation {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  lastUpdated: string;
  tags: string[];
  requirements: string[];
  consequences: string;
  bestPractices: string[];
  relatedRegulations: string[];
  fTag?: string;
  scope?: string;
  implementation?: string[];
  monitoring?: string[];
  documentation?: string[];
  commonDeficiencies?: string[];
  surveyorFocus?: string[];
  keyQuestions?: string[];
  actionSteps?: string[];
}

interface ComplianceUpdate {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  source: string;
  link?: string;
}

interface ComplianceResource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'tool' | 'template' | 'guide';
  category: string;
  url?: string;
  lastUpdated: string;
}

// CMS regulations data - now loaded from database
const defaultCmsRegulations: ComplianceRegulation[] = [
  {
    id: "f-tag-514",
    category: "Quality of Care",
    title: "Nursing Services - Sufficient Staff (F-Tag 514)",
    description: "Each resident must receive and the facility must provide the necessary care and services to attain or maintain the highest practicable physical, mental, and psychosocial well-being.",
    severity: "critical",
    fTag: "F-514",
    scope: "All nursing home residents requiring nursing services",
    lastUpdated: "2024-01-15",
    tags: ["staffing", "nursing", "quality", "care-planning"],
    requirements: [
      "Provide 24-hour nursing services sufficient to meet resident needs",
      "Ensure RN supervision at least 8 consecutive hours per day, 7 days a week",
      "Maintain adequate staffing levels to meet residents' assessed needs",
      "Have a charge nurse on each tour of duty"
    ],
    consequences: "Immediate Jeopardy potential with fines up to $21,393 per day. Can lead to termination of provider agreement.",
    bestPractices: [
      "Conduct regular staffing assessments based on resident acuity",
      "Implement consistent assignment practices",
      "Maintain comprehensive orientation programs",
      "Use evidence-based staffing tools and metrics",
      "Document all staffing decisions and rationales"
    ],
    relatedRegulations: ["F-515", "F-516", "F-725"],
    implementation: [
      "Assess resident needs using validated assessment tools",
      "Create staffing matrices based on census and acuity",
      "Develop contingency plans for staffing shortfalls",
      "Implement staff retention strategies"
    ],
    monitoring: [
      "Daily staffing reports and variance analysis",
      "Monthly quality indicator reviews",
      "Quarterly staffing effectiveness assessments",
      "Annual comprehensive staffing studies"
    ],
    documentation: [
      "Daily assignment sheets with staff-to-resident ratios",
      "Nursing supervisor logs",
      "Staffing variance reports with corrective actions",
      "Competency assessments and training records"
    ],
    commonDeficiencies: [
      "Insufficient nursing staff to meet resident needs",
      "Lack of RN supervision for required hours",
      "Inadequate documentation of staffing decisions",
      "No contingency plans for staffing emergencies"
    ],
    surveyorFocus: [
      "Review staffing schedules vs. actual coverage",
      "Interview residents about unmet needs",
      "Observe care delivery during different shifts",
      "Examine incident reports related to staffing"
    ],
    keyQuestions: [
      "How do you determine appropriate staffing levels?",
      "What is your process for covering unplanned absences?",
      "How do you ensure RN coverage requirements are met?",
      "What measures do you use to assess staffing effectiveness?"
    ],
    actionSteps: [
      "Complete immediate staffing assessment",
      "Review and update staffing policies",
      "Implement daily staffing huddles",
      "Establish emergency staffing protocols"
    ]
  },
  {
    id: "f-tag-686",
    category: "Infection Prevention",
    title: "Infection Prevention and Control Program (F-Tag 686)",
    description: "The facility must establish an infection prevention and control program (IPCP) that must be designed to provide a safe, sanitary, and comfortable environment and to help prevent the development and transmission of communicable diseases and infections.",
    severity: "critical",
    fTag: "F-686",
    scope: "All residents, staff, and visitors",
    lastUpdated: "2024-02-20",
    tags: ["infection-control", "safety", "covid", "communicable-diseases"],
    requirements: [
      "Designate an infection preventionist with specialized training",
      "Establish written infection prevention and control policies",
      "Implement surveillance, prevention, and control of infections",
      "Provide infection prevention education to staff",
      "Maintain isolation precautions when indicated",
      "Report communicable diseases and infections to appropriate authorities"
    ],
    consequences: "Can result in Immediate Jeopardy citations with fines up to $21,393 per day. May require immediate closure of facility.",
    bestPractices: [
      "Implement evidence-based infection prevention protocols",
      "Conduct regular hand hygiene audits",
      "Maintain proper PPE inventory and training",
      "Establish antimicrobial stewardship programs",
      "Create robust outbreak response plans"
    ],
    relatedRegulations: ["F-880", "F-441", "F-607"],
    implementation: [
      "Hire qualified infection preventionist",
      "Develop comprehensive IPCP policies",
      "Create surveillance systems for infection tracking",
      "Establish staff education programs"
    ],
    monitoring: [
      "Monthly infection surveillance reports",
      "Quarterly IPCP effectiveness reviews",
      "Annual risk assessments",
      "Continuous hand hygiene monitoring"
    ],
    documentation: [
      "Infection prevention policies and procedures",
      "Staff training records and competencies",
      "Infection surveillance logs",
      "Outbreak investigation reports"
    ],
    commonDeficiencies: [
      "Lack of qualified infection preventionist",
      "Inadequate surveillance systems",
      "Poor hand hygiene compliance",
      "Insufficient PPE supplies or training"
    ],
    surveyorFocus: [
      "Review infection rates and trends",
      "Observe infection prevention practices",
      "Interview infection preventionist",
      "Examine outbreak response documentation"
    ],
    keyQuestions: [
      "Who is your designated infection preventionist?",
      "How do you conduct infection surveillance?",
      "What is your hand hygiene compliance rate?",
      "How do you respond to suspected outbreaks?"
    ],
    actionSteps: [
      "Verify infection preventionist credentials",
      "Update IPCP policies and procedures",
      "Conduct staff competency assessments",
      "Review outbreak response protocols"
    ]
  },
  {
    id: "f-tag-725",
    category: "Quality Assurance",
    title: "Quality Assurance and Performance Improvement (F-Tag 725)",
    description: "The facility must develop, implement, and maintain an effective, comprehensive, data-driven quality assurance and performance improvement (QAPI) program.",
    severity: "high",
    fTag: "F-725",
    scope: "All facility operations and resident care",
    lastUpdated: "2024-01-30",
    tags: ["quality-improvement", "data-analysis", "performance", "qapi"],
    requirements: [
      "Develop comprehensive QAPI program addressing all services",
      "Use data to identify opportunities for improvement",
      "Set measurable objectives and track progress",
      "Implement systematic approach to improvement",
      "Include governing body, medical director, and staff in QAPI activities"
    ],
    consequences: "Fines ranging from $1,000 to $10,000 per day. Can impact survey scoring and reimbursement.",
    bestPractices: [
      "Use evidence-based quality measures",
      "Implement Plan-Do-Study-Act (PDSA) cycles",
      "Engage frontline staff in improvement activities",
      "Benchmark against national standards",
      "Maintain robust data collection systems"
    ],
    relatedRegulations: ["F-514", "F-686", "F-880"],
    implementation: [
      "Establish QAPI committee structure",
      "Define quality measures and targets",
      "Create data collection systems",
      "Develop improvement project protocols"
    ],
    monitoring: [
      "Monthly QAPI committee meetings",
      "Quarterly performance dashboards",
      "Annual program effectiveness reviews",
      "Ongoing project status tracking"
    ],
    documentation: [
      "QAPI program description and policies",
      "Committee meeting minutes and reports",
      "Quality measure data and trends",
      "Improvement project documentation"
    ],
    commonDeficiencies: [
      "Lack of systematic approach to quality improvement",
      "Insufficient data collection and analysis",
      "No evidence of improvement activities",
      "Limited staff engagement in QAPI processes"
    ],
    surveyorFocus: [
      "Review QAPI program structure and activities",
      "Examine quality measure data and trends",
      "Interview QAPI committee members",
      "Assess improvement project effectiveness"
    ],
    keyQuestions: [
      "How does your QAPI program identify improvement opportunities?",
      "What quality measures do you track?",
      "How do you engage staff in quality improvement?",
      "Can you show evidence of successful improvements?"
    ],
    actionSteps: [
      "Review and update QAPI program structure",
      "Identify key quality measures to track",
      "Establish regular committee meetings",
      "Launch pilot improvement projects"
    ]
  }
];

// Mock compliance updates
const complianceUpdates: ComplianceUpdate[] = [
  {
    id: "update-1",
    title: "New CMS Staffing Requirements Take Effect",
    summary: "CMS has implemented new minimum staffing requirements for nursing homes, including specific RN and total nursing hour minimums.",
    date: "2024-02-15",
    category: "Staffing",
    impact: "high",
    source: "CMS.gov",
    link: "https://cms.gov/staffing-updates"
  },
  {
    id: "update-2",
    title: "Updated Infection Control Guidelines",
    summary: "New guidance on respiratory infection prevention protocols, including updated isolation procedures.",
    date: "2024-02-10",
    category: "Infection Control",
    impact: "medium",
    source: "CDC",
    link: "https://cdc.gov/ltc-infection-control"
  },
  {
    id: "update-3",
    title: "QAPI Program Assessment Tool Released",
    summary: "CMS has released a new self-assessment tool for evaluating Quality Assurance and Performance Improvement programs.",
    date: "2024-02-05",
    category: "Quality Improvement",
    impact: "medium",
    source: "CMS Quality Partnership",
    link: "https://cms.gov/qapi-tool"
  }
];

const categories = [
  { id: "all", name: "All Categories", icon: BookOpen },
  { id: "Quality of Care", name: "Quality of Care", icon: Heart },
  { id: "Infection Prevention", name: "Infection Prevention", icon: Shield },
  { id: "Quality Assurance", name: "Quality Assurance", icon: Activity },
  { id: "Staffing", name: "Staffing", icon: Users },
  { id: "Administration", name: "Administration", icon: Building },
  { id: "Pharmacy", name: "Pharmacy", icon: Pill },
  { id: "Dietary", name: "Dietary", icon: Brain },
  { id: "Environment", name: "Environment", icon: Eye },
];

export default function CMSGuidancePage() {
  const { user } = useAuth();
  const [regulations, setRegulations] = useState<ComplianceRegulation[]>(defaultCmsRegulations);
  const [updates, setUpdates] = useState<ComplianceUpdate[]>([]);
  const [resources, setResources] = useState<ComplianceResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [expandedRegulations, setExpandedRegulations] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"regulations" | "updates" | "favorites">("regulations");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load regulations
        const regulationsResponse = await fetch('/api/cms-guidance?type=regulations');
        if (regulationsResponse.ok) {
          const regulationsData = await regulationsResponse.json();
          if (regulationsData.regulations && regulationsData.regulations.length > 0) {
            setRegulations(regulationsData.regulations);
          }
        }
        
        // Load updates
        const updatesResponse = await fetch('/api/cms-guidance?type=updates');
        if (updatesResponse.ok) {
          const updatesData = await updatesResponse.json();
          setUpdates(updatesData.updates || []);
        }
        
        // Load resources
        const resourcesResponse = await fetch('/api/cms-guidance?type=resources');
        if (resourcesResponse.ok) {
          const resourcesData = await resourcesResponse.json();
          setResources(resourcesData.resources || []);
        }
      } catch (error) {
        console.error('Error loading CMS guidance data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter regulations based on search and filters
  const filteredRegulations = useMemo(() => {
    return regulations.filter(regulation => {
      const matchesCategory = selectedCategory === "all" || regulation.category === selectedCategory;
      const matchesSeverity = selectedSeverity === "all" || regulation.severity === selectedSeverity;
      const matchesSearch = searchQuery === "" || 
        regulation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        regulation.fTag?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSeverity && matchesSearch;
    });
  }, [selectedCategory, selectedSeverity, searchQuery]);

  // Toggle regulation expansion
  const toggleRegulation = (id: string) => {
    const newExpanded = new Set(expandedRegulations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRegulations(newExpanded);
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Refresh data
  const refreshData = () => {
    setLastRefresh(new Date());
    // In a real implementation, this would fetch fresh data from APIs
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8 scrollable">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CMS Compliance Guidance</h1>
              <p className="text-gray-600 mt-1">Real-time regulatory guidance and compliance support</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            {[
              { id: 'regulations', label: 'Regulations', icon: BookOpen },
              { id: 'updates', label: 'Updates', icon: AlertCircle },
              { id: 'favorites', label: 'Favorites', icon: Star }
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
                {tab.id === 'favorites' && favorites.size > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {favorites.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Compliance Dashboard */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Compliance Alerts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <ComplianceAlerts limit={4} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Compliance Status</h3>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Live data"></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Critical Issues</span>
                  <span className="text-sm font-semibold text-red-600">2</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Warnings</span>
                  <span className="text-sm font-semibold text-yellow-600">5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Up to Date</span>
                  <span className="text-sm font-semibold text-green-600">127</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Overall Score</span>
                  <span className="font-semibold text-green-600">94%</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Upcoming Deadlines</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-yellow-500" />
                  <span className="text-gray-600">QAPI Review</span>
                  <span className="text-yellow-600 font-medium ml-auto">3 days</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-red-500" />
                  <span className="text-gray-600">Policy Update</span>
                  <span className="text-red-600 font-medium ml-auto">Overdue</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-green-500" />
                  <span className="text-gray-600">Staff Training</span>
                  <span className="text-green-600 font-medium ml-auto">7 days</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Updates</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">F-514 Updated</span>
                  </div>
                  <p className="text-gray-600 text-xs">New staffing requirements effective March 1st</p>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">F-686 Guidance</span>
                  </div>
                  <p className="text-gray-600 text-xs">Enhanced infection control protocols published</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulations Tab */}
        {activeTab === 'regulations' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search regulations, F-Tags, or topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="min-w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                {/* Severity Filter */}
                <div className="min-w-32">
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredRegulations.length} of {regulations.length} regulations
              </div>
            </div>

            {/* Regulations List */}
            <div className="space-y-4">
              {filteredRegulations.map(regulation => (
                <div
                  key={regulation.id}
                  className="bg-white rounded-lg shadow-sm border"
                >
                  {/* Regulation Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleRegulation(regulation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {regulation.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(regulation.id);
                            }}
                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                              favorites.has(regulation.id) 
                                ? 'text-yellow-500' 
                                : 'text-gray-400 hover:text-yellow-500'
                            }`}
                          >
                            <Star size={16} fill={favorites.has(regulation.id) ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{regulation.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {regulation.fTag && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md font-medium">
                              {regulation.fTag}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-sm rounded-md border ${getSeverityColor(regulation.severity)}`}>
                            {regulation.severity.charAt(0).toUpperCase() + regulation.severity.slice(1)}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                            {regulation.category}
                          </span>
                          {regulation.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button className="ml-4 p-2 hover:bg-gray-200 rounded transition-colors">
                        {expandedRegulations.has(regulation.id) ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedRegulations.has(regulation.id) && (
                    <div className="border-t bg-gray-50">
                      <div className="p-6 space-y-6">
                        {/* Requirements */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle size={18} className="text-green-600" />
                            Requirements
                          </h4>
                          <ul className="space-y-2">
                            {regulation.requirements.map((req, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                                <span className="text-gray-700">{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Consequences */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-600" />
                            Potential Consequences
                          </h4>
                          <p className="text-gray-700 bg-red-50 p-3 rounded-lg border border-red-200">
                            {regulation.consequences}
                          </p>
                        </div>

                        {/* Best Practices */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Star size={18} className="text-yellow-600" />
                            Best Practices
                          </h4>
                          <ul className="space-y-2">
                            {regulation.bestPractices.map((practice, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-1 shrink-0" />
                                <span className="text-gray-700">{practice}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Additional Details Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Implementation Steps */}
                          {regulation.implementation && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Implementation Steps</h5>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {regulation.implementation.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-500 font-medium">{idx + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Monitoring */}
                          {regulation.monitoring && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Monitoring Activities</h5>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {regulation.monitoring.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Eye size={14} className="text-purple-500 mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Documentation */}
                          {regulation.documentation && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Required Documentation</h5>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {regulation.documentation.map((doc, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <FileText size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                    <span>{doc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Common Deficiencies */}
                          {regulation.commonDeficiencies && (
                            <div>
                              <h5 className="font-medium text-red-700 mb-2">Common Deficiencies</h5>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {regulation.commonDeficiencies.map((def, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                    <span>{def}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Surveyor Focus */}
                        {regulation.surveyorFocus && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Search size={18} className="text-orange-600" />
                              What Surveyors Look For
                            </h4>
                            <ul className="space-y-2">
                              {regulation.surveyorFocus.map((focus, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></div>
                                  <span className="text-gray-700">{focus}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Questions */}
                        {regulation.keyQuestions && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Brain size={18} className="text-purple-600" />
                              Key Questions to Consider
                            </h4>
                            <ul className="space-y-2">
                              {regulation.keyQuestions.map((question, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-purple-500 font-bold">Q:</span>
                                  <span className="text-gray-700 italic">{question}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Steps */}
                        {regulation.actionSteps && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Plus size={18} className="text-green-600" />
                              Immediate Action Steps
                            </h4>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <ul className="space-y-2">
                                {regulation.actionSteps.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="text-gray-700 font-medium">{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-gray-500">
                            Last updated: {new Date(regulation.lastUpdated).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <button className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Download size={14} />
                              Export
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <ExternalLink size={14} />
                              View Source
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredRegulations.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                  <Search size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No regulations found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="space-y-4">
            {complianceUpdates.map(update => (
              <div key={update.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{update.title}</h3>
                    <p className="text-gray-600 mb-3">{update.summary}</p>
                  </div>
                  <span className={`px-2 py-1 text-sm rounded-md ${getImpactColor(update.impact)}`}>
                    {update.impact} impact
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(update.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Info size={14} />
                      {update.source}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                      {update.category}
                    </span>
                  </div>
                  
                  {update.link && (
                    <a
                      href={update.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <ExternalLink size={14} />
                      Read More
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favorites.size === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <Star size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-600">Star regulations to add them to your favorites for quick access.</p>
              </div>
            ) : (
              filteredRegulations
                .filter(reg => favorites.has(reg.id))
                .map(regulation => (
                  <div
                    key={regulation.id}
                    className="bg-white rounded-lg shadow-sm border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{regulation.title}</h3>
                        <p className="text-gray-600 text-sm">{regulation.description}</p>
                        <div className="flex gap-2 mt-2">
                          {regulation.fTag && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md">
                              {regulation.fTag}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-sm rounded-md border ${getSeverityColor(regulation.severity)}`}>
                            {regulation.severity}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('regulations');
                          setExpandedRegulations(new Set([regulation.id]));
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}