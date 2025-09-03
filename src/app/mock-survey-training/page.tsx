"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  User, 
  Shield, 
  Clock, 
  FileText, 
  AlertTriangle,
  Settings,
  MessageSquare,
  Play,
  RotateCcw,
  Building2,
  Users,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Eye,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  id: string;
  sender: 'surveyor' | 'user';
  content: string;
  timestamp: Date;
  documentRequests?: string[];
  followUpNeeded?: boolean;
}

interface UserInfo {
  title: string;
  department: string;
  yearsExperience: string;
  facilityType: string;
  facilitySize: string;
}

export default function MockSurveyTraining() {
  const { user } = useAuth();
  const [showSetupForm, setShowSetupForm] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    title: '',
    department: '',
    yearsExperience: '',
    facilityType: '',
    facilitySize: ''
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartSession = async () => {
    if (!userInfo.title || !userInfo.department) {
      alert('Please fill in your title and department to start the simulation.');
      return;
    }

    setShowSetupForm(false);
    setSessionStarted(true);
    
    // Initial surveyor greeting
    const initialMessage: Message = {
      id: Date.now().toString(),
      sender: 'surveyor',
      content: `Good morning! I'm conducting a survey of your facility today. I'm Sarah Johnson, a state surveyor with the Department of Health. I understand you're the ${userInfo.title} in ${userInfo.department}. 

I'll be reviewing your facility's compliance with federal regulations. To start, I'd like to understand your role better and then we'll begin with some standard questions and document reviews.

Can you tell me about your primary responsibilities in your current position?`,
      timestamp: new Date()
    };

    setMessages([initialMessage]);
  };

  const generateSurveyorResponse = async (userMessage: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/mock-surveyor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          userInfo,
          conversationHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get surveyor response');
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const surveyorResponse = data.response;

      // Add surveyor response
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'surveyor',
        content: surveyorResponse.trim(),
        timestamp: new Date(),
        documentRequests: extractDocumentRequests(surveyorResponse),
        followUpNeeded: surveyorResponse.toLowerCase().includes('follow up') || surveyorResponse.includes('?')
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error getting surveyor response:', error);
      
      // Fallback response
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        sender: 'surveyor',
        content: `I see. Can you provide me with more details about your facility's procedures for that? I'd also like to review the relevant policies and documentation. This is important for compliance with federal regulations.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    }
    
    setIsLoading(false);
  };

  const extractDocumentRequests = (message: string): string[] => {
    const requests: string[] = [];
    const docKeywords = [
      'policy', 'policies', 'procedure', 'procedures', 'documentation', 'records', 
      'manual', 'log', 'report', 'assessment', 'care plan', 'medication records',
      'training records', 'license', 'certification', 'audit', 'inspection'
    ];
    
    docKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) {
        requests.push(keyword);
      }
    });
    
    return [...new Set(requests)]; // Remove duplicates
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');

    // Generate surveyor response
    await generateSurveyorResponse(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetSession = () => {
    setMessages([]);
    setSessionStarted(false);
    setShowSetupForm(true);
    setUserInfo({
      title: '',
      department: '',
      yearsExperience: '',
      facilityType: '',
      facilitySize: ''
    });
  };

  if (showSetupForm) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Mock Survey Simulation</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Experience a realistic survey interview with an AI surveyor. Get familiar with the types of questions, 
              document requests, and scenarios you'll encounter during an actual survey.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-center">Setup Your Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Title/Position *
                </label>
                <select
                  value={userInfo.title}
                  onChange={(e) => setUserInfo(prev => ({...prev, title: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select your title</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Director of Nursing">Director of Nursing</option>
                  <option value="Assistant Director of Nursing">Assistant Director of Nursing</option>
                  <option value="Charge Nurse">Charge Nurse</option>
                  <option value="Staff Nurse">Staff Nurse</option>
                  <option value="Unit Manager">Unit Manager</option>
                  <option value="Social Services Director">Social Services Director</option>
                  <option value="Activities Director">Activities Director</option>
                  <option value="Dietary Manager">Dietary Manager</option>
                  <option value="Maintenance Director">Maintenance Director</option>
                  <option value="Medical Records Coordinator">Medical Records Coordinator</option>
                  <option value="Quality Assurance Coordinator">Quality Assurance Coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                <select
                  value={userInfo.department}
                  onChange={(e) => setUserInfo(prev => ({...prev, department: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select your department</option>
                  <option value="Administration">Administration</option>
                  <option value="Nursing">Nursing</option>
                  <option value="Social Services">Social Services</option>
                  <option value="Activities">Activities</option>
                  <option value="Dietary/Food Services">Dietary/Food Services</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Medical Records">Medical Records</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Therapy Services">Therapy Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Years of Experience
                </label>
                <select
                  value={userInfo.yearsExperience}
                  onChange={(e) => setUserInfo(prev => ({...prev, yearsExperience: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select experience level</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="6-10 years">6-10 years</option>
                  <option value="More than 10 years">More than 10 years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facility Type
                </label>
                <select
                  value={userInfo.facilityType}
                  onChange={(e) => setUserInfo(prev => ({...prev, facilityType: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select facility type</option>
                  <option value="Skilled Nursing Facility">Skilled Nursing Facility</option>
                  <option value="Nursing Home">Nursing Home</option>
                  <option value="Assisted Living">Assisted Living</option>
                  <option value="Memory Care">Memory Care</option>
                  <option value="Long-term Care">Long-term Care</option>
                  <option value="Rehabilitation Center">Rehabilitation Center</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facility Size
                </label>
                <select
                  value={userInfo.facilitySize}
                  onChange={(e) => setUserInfo(prev => ({...prev, facilitySize: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select facility size</option>
                  <option value="Small (1-50 beds)">Small (1-50 beds)</option>
                  <option value="Medium (51-100 beds)">Medium (51-100 beds)</option>
                  <option value="Large (101-200 beds)">Large (101-200 beds)</option>
                  <option value="Very Large (200+ beds)">Very Large (200+ beds)</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">What to Expect:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• The AI surveyor will ask role-specific questions based on your title and department</li>
                    <li>• You'll be asked for documents, policies, and procedures</li>
                    <li>• Questions will follow real survey patterns and regulations</li>
                    <li>• This is practice - take your time and ask questions if needed</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartSession}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Play className="h-5 w-5" />
              Start Survey Simulation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Survey Simulation</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You: {userInfo.title} | {userInfo.department}
              </p>
            </div>
          </div>
          <button
            onClick={resetSession}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Session
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'surveyor' && (
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white ml-12'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">
                    {message.sender === 'surveyor' ? 'Sarah Johnson (State Surveyor)' : 'You'}
                  </span>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.documentRequests && message.documentRequests.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        Documents/Information Requested
                      </span>
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">
                      {message.documentRequests.join(', ')}
                    </div>
                  </div>
                )}
              </div>
              
              {message.sender === 'user' && (
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Surveyor is responding...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response to the surveyor..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}