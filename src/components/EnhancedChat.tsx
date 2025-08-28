import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  Bookmark, 
  MoreVertical, 
  RefreshCw, 
  Download,
  Share,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Bot,
  Paperclip,
  X,
  Search,
  Filter,
  Star,
  MessageCircle,
  FileText,
  Lightbulb,
  Shield,
  Building2
} from 'lucide-react';

const EnhancedChat = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [bookmarkedMessages, setBookmarkedMessages] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Role-specific suggestions
  const getSuggestionsByRole = (role, facilityType) => {
    const baseRole = role?.toLowerCase() || '';
    
    if (baseRole.includes('administrator') || baseRole.includes('admin')) {
      return [
        "What are the key regulatory changes for nursing homes in 2024?",
        "Help me prepare for our upcoming CMS survey",
        "Create a staff meeting agenda for compliance updates",
        "What should I include in our QAPI quarterly report?",
        "Review our current policies for F-tag compliance",
        "Draft a communication to families about new visitation policies"
      ];
    }
    
    if (baseRole.includes('director of nursing') || baseRole.includes('don')) {
      return [
        "Create a nursing assessment checklist for new admissions",
        "What are the latest infection control requirements?",
        "Help me develop a staffing plan that meets CMS requirements",
        "Review medication administration best practices",
        "Create a care plan audit template",
        "What training do my nurses need for fall prevention?"
      ];
    }
    
    if (baseRole.includes('social services')) {
      return [
        "How do I conduct a proper discharge planning meeting?",
        "What are resident rights regarding room changes?",
        "Create a template for care plan meetings with families",
        "Help me address a resident grievance appropriately",
        "What documentation is required for guardianship issues?",
        "Draft a family communication about care updates"
      ];
    }
    
    if (baseRole.includes('activities')) {
      return [
        "Create activity programs for residents with dementia",
        "What are therapeutic recreation requirements?",
        "Help me plan meaningful activities during COVID restrictions",
        "How do I document activity participation for MDS?",
        "Create a volunteer program that meets compliance standards",
        "What activities promote social engagement for isolated residents?"
      ];
    }
    
    // Default suggestions
    return [
      "What should I know about CMS survey preparation?",
      "Help me understand F-tag requirements",
      "Create a compliance checklist for my department",
      "What are the documentation requirements for resident care?",
      "Help me improve our quality measures",
      "What training do staff need for regulatory compliance?"
    ];
  };

  useEffect(() => {
    loadUserProfile();
    loadMessages();
    loadBookmarks();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchQuery, messages]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setShowSuggestions(data.messages?.length === 0);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadBookmarks = () => {
    const saved = localStorage.getItem('bookmarked-messages');
    if (saved) {
      setBookmarkedMessages(new Set(JSON.parse(saved)));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    
    setShowSuggestions(false);
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      attachments: attachedFiles,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setAttachedFiles([]);
    setIsStreaming(true);

    try {
      // Simulate streaming response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Mock streaming response based on user role and query
      const mockResponse = generateContextualResponse(inputText, userProfile);
      
      // Simulate character-by-character streaming
      for (let i = 0; i <= mockResponse.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: mockResponse.slice(0, i) }
            : msg
        ));
      }
      
      // Mark streaming complete
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, isStreaming: false }
          : msg
      ));
      
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const generateContextualResponse = (query, profile) => {
    const role = profile?.role?.toLowerCase() || '';
    const facilityState = profile?.facility_state || '';
    const facilityName = profile?.facility_name || 'your facility';
    
    // Generate role-specific responses
    if (query.toLowerCase().includes('survey') || query.toLowerCase().includes('cms')) {
      return `Based on your role as ${profile?.role || 'a healthcare professional'} at ${facilityName}${facilityState ? ` in ${facilityState}` : ''}, here's what you need to know about CMS survey preparation:

**Key Focus Areas:**
1. **Documentation Review** - Ensure all policies are current and properly implemented
2. **Staffing Compliance** - Verify adequate staffing levels per 42 CFR 483.35
3. **Resident Care Plans** - Review care plans for accuracy and timeliness
4. **Quality Measures** - Check your facility's performance on key quality indicators

**${facilityState ? `${facilityState}-Specific` : 'State'} Considerations:**
${facilityState === 'CA' ? '- California requires additional infection control protocols per HSC 1275.5' : 
  facilityState === 'TX' ? '- Texas has specific requirements for administrator presence during surveys' :
  '- Check your state regulations for additional requirements beyond federal standards'}

**Immediate Actions:**
- Conduct pre-survey audits of high-risk F-tags
- Brief all staff on survey procedures
- Ensure all required documentation is readily available
- Review incident reports and corrective actions from the past 15 months

Would you like me to create a specific survey preparation checklist for your role?`;
    }
    
    if (query.toLowerCase().includes('policy') || query.toLowerCase().includes('procedure')) {
      return `As ${profile?.role || 'a healthcare professional'}, here's guidance on policy development and management:

**Policy Development Best Practices:**
1. **Regulatory Alignment** - Ensure policies reflect current CMS requirements
2. **Facility-Specific Content** - Tailor policies to ${facilityName}'s operations
3. **Review Cycle** - Policies should be reviewed at least every 3 years
4. **Staff Training** - All staff must be trained on new/updated policies

**Key Policy Categories:**
- Clinical care and services (F-tags 600-699)
- Resident rights and facility practices (F-tags 550-599)  
- Administration and governance (F-tags 800-889)
- Life safety and emergency preparedness (K-tags and F-838)

**Implementation Tips:**
- Use clear, actionable language
- Include staff responsibilities and accountability measures
- Establish monitoring and compliance mechanisms
- Document staff acknowledgment and training

Would you like help drafting a specific policy or reviewing an existing one?`;
    }
    
    // Default contextual response
    return `Hello! I'm here to help you with nursing home compliance and operations. As ${profile?.role || 'a healthcare professional'} at ${facilityName}${facilityState ? ` in ${facilityState}` : ''}, I can assist you with:

• **Regulatory Guidance** - CMS requirements, state regulations, and F-tag compliance
• **Survey Preparation** - Readiness checklists and documentation review  
• **Policy Development** - Creating and updating facility policies
• **Quality Improvement** - QAPI planning and performance monitoring
• **Staff Training** - Educational content and competency requirements

How can I help you today? Feel free to ask specific questions about compliance, operations, or any challenges you're facing.`;
  };

  const copyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const toggleBookmark = (messageId) => {
    const newBookmarks = new Set(bookmarkedMessages);
    if (newBookmarks.has(messageId)) {
      newBookmarks.delete(messageId);
    } else {
      newBookmarks.add(messageId);
    }
    setBookmarkedMessages(newBookmarks);
    localStorage.setItem('bookmarked-messages', JSON.stringify([...newBookmarks]));
  };

  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const regenerateResponse = (messageIndex) => {
    // Find the user message that preceded this assistant message
    const userMessage = messages[messageIndex - 1];
    if (userMessage && userMessage.role === 'user') {
      // Regenerate response based on the original user message
      const newResponse = generateContextualResponse(userMessage.content, userProfile);
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex 
          ? { ...msg, content: newResponse, regenerated: true }
          : msg
      ));
    }
  };

  const exportChat = () => {
    const chatData = {
      facility: userProfile?.facility_name,
      user: userProfile?.full_name || userProfile?.email,
      role: userProfile?.role,
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careiq-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const suggestions = getSuggestionsByRole(userProfile?.role, userProfile?.facility_type);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header with Context */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">CareIQ Assistant</h1>
              <p className="text-sm text-gray-600">
                {userProfile?.role && userProfile?.facility_name 
                  ? `${userProfile.role} • ${userProfile.facility_name}${userProfile.facility_state ? ` • ${userProfile.facility_state}` : ''}`
                  : 'Nursing Home Compliance Assistant'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={exportChat}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Export chat"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.length === 0 && !showSuggestions ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Avatar */}
                  <div className={`flex items-center gap-2 mb-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      message.role === 'user' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {message.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </div>
                    <span className="text-xs text-gray-500">
                      {message.role === 'user' ? 'You' : 'CareIQ'}
                    </span>
                    {message.timestamp && (
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    {/* File Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {message.attachments.map((file, fileIndex) => (
                          <div key={fileIndex} className="flex items-center gap-2 p-2 bg-white/10 rounded">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-5 bg-current ml-1 animate-pulse" />
                      )}
                    </div>

                    {message.regenerated && (
                      <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Regenerated response
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  {message.role === 'assistant' && !message.isStreaming && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(message.content, message.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => toggleBookmark(message.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500 rounded"
                        title="Bookmark message"
                      >
                        <Bookmark className={`h-4 w-4 ${bookmarkedMessages.has(message.id) ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                      </button>
                      
                      <button
                        onClick={() => regenerateResponse(index)}
                        className="p-1 text-gray-400 hover:text-blue-500 rounded"
                        title="Regenerate response"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Welcome Message and Suggestions */}
            {showSuggestions && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CareIQ</h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Your AI-powered nursing home compliance assistant. 
                    {userProfile?.role && ` Customized for your role as ${userProfile.role}.`}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Suggested questions for you:
                  </h3>
                  <div className="grid gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setInputText(suggestion)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-sm">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {/* File Attachments Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.csv"
            onChange={handleFileAttach}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about compliance, regulations, or nursing home operations..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={Math.min(Math.max(inputText.split('\n').length, 1), 4)}
              disabled={isStreaming}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && attachedFiles.length === 0) || isStreaming}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center">
          CareIQ provides guidance based on current regulations. Always verify critical compliance information.
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat;