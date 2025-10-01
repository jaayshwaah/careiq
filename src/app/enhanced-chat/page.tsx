"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Send, 
  Paperclip, 
  Download, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  FileText,
  Image,
  FileSpreadsheet,
  MessageCircle,
  User,
  Bot,
  Search,
  BookOpen,
  Shield,
  Building2,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  citations?: Citation[];
  isStreaming?: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'xml' | 'image';
  size: number;
  url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

interface Citation {
  id: string;
  title: string;
  source: string;
  page?: number;
  relevance: number;
}

interface ChatContext {
  resident?: {
    id: string;
    name: string;
    room: string;
    unit: string;
  };
  facility?: {
    id: string;
    name: string;
    state: string;
  };
  policy?: {
    id: string;
    title: string;
    fTag?: string;
  };
}

const EnhancedChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [context, setContext] = useState<ChatContext>({});
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentChats, setRecentChats] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptPresets = [
    {
      id: 'summarize-incident',
      title: 'Summarize Incident',
      description: 'Analyze incident report and provide summary',
      prompt: 'Please analyze this incident report and provide a concise summary with key findings and recommendations.'
    },
    {
      id: 'draft-care-plan',
      title: 'Draft Care Plan',
      description: 'Create care plan under F684 guidelines',
      prompt: 'Help me draft a comprehensive care plan following F684 guidelines for quality of care and treatment.'
    },
    {
      id: 'compliance-check',
      title: 'Compliance Check',
      description: 'Review document for CMS compliance',
      prompt: 'Review this document for CMS compliance issues and provide specific recommendations for improvement.'
    },
    {
      id: 'policy-lookup',
      title: 'Policy Lookup',
      description: 'Find relevant policies and procedures',
      prompt: 'Help me find the relevant policies and procedures for this situation.'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${inputValue}". Let me help you with that. Based on the information provided, here are my recommendations...`,
        timestamp: new Date(),
        citations: [
          {
            id: '1',
            title: 'F684 - Quality of Care',
            source: 'CMS State Operations Manual',
            page: 45,
            relevance: 0.95
          },
          {
            id: '2',
            title: 'Facility Policy - Incident Reporting',
            source: 'Internal Policy Manual',
            relevance: 0.87
          }
        ],
        isStreaming: false
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      const attachment: Attachment = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() as any || 'pdf',
        size: file.size,
        status: 'uploading'
      };

      setAttachments(prev => [...prev, attachment]);

      // Simulate upload
      setTimeout(() => {
        setAttachments(prev => 
          prev.map(att => 
            att.id === attachment.id 
              ? { ...att, status: 'ready' as const }
              : att
          )
        );
      }, 1000);
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText size={16} className="text-red-500" />;
      case 'docx':
        return <FileText size={16} className="text-blue-500" />;
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet size={16} className="text-green-500" />;
      case 'image':
        return <Image size={16} className="text-purple-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-screen bg-[var(--bg)] flex">
      {/* Chat List Sidebar */}
      <div className="w-80 glass border-r border-[var(--glass-border)] flex flex-col">
        <div className="p-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">
              Recent Chats
            </h2>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setMessages([])}
            >
              New
            </Button>
          </div>
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <Card
                key={chat.id}
                variant="glass"
                interactive
                className="p-3 cursor-pointer hover:bg-[var(--muted)]/50"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={16} className="text-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-primary truncate">
                      {chat.title}
                    </div>
                    <div className="text-sm text-muted">
                      {chat.lastMessage}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="glass border-b border-[var(--glass-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-primary">
                AI Assistant
              </h1>
              <p className="text-sm text-muted">
                Ask questions, analyze documents, or get compliance guidance
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContextPanel(!showContextPanel)}
            >
              {showContextPanel ? 'Hide Context' : 'Show Context'}
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center mb-4 mx-auto">
                  <Bot size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  Start a conversation
                </h2>
                <p className="text-muted mb-6">
                  Ask questions, upload documents, or choose a preset prompt
                </p>
              </div>

              {/* Prompt Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {promptPresets.map((preset) => (
                  <Card
                    key={preset.id}
                    variant="glass"
                    interactive
                    className="p-4 cursor-pointer hover:bg-[var(--muted)]/50"
                    onClick={() => setInputValue(preset.prompt)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-[var(--radius-md)] bg-[var(--accent)]/10">
                        <MessageCircle size={20} className="text-[var(--accent)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary mb-1">
                          {preset.title}
                        </h3>
                        <p className="text-sm text-muted">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={cn(
                  "flex gap-3 max-w-3xl",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}>
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === 'user' 
                      ? "bg-[var(--accent)]" 
                      : "bg-[var(--muted)]"
                  )}>
                    {message.role === 'user' ? (
                      <User size={16} className="text-white" />
                    ) : (
                      <Bot size={16} className="text-primary" />
                    )}
                  </div>

                  {/* Message Content */}
                  <Card
                    variant="glass"
                    className={cn(
                      "p-4",
                      message.role === 'user' 
                        ? "bg-[var(--accent)] text-[var(--accent-contrast)]" 
                        : "bg-[var(--card)]"
                    )}
                  >
                    <CardContent className="p-0">
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 bg-[var(--muted)]/50 rounded-[var(--radius-md)]"
                            >
                              {getFileIcon(attachment.type)}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {attachment.name}
                                </div>
                                <div className="text-xs text-muted">
                                  {formatFileSize(attachment.size)}
                                </div>
                              </div>
                              <div className={cn(
                                "text-xs px-2 py-1 rounded",
                                attachment.status === 'ready' 
                                  ? "bg-[var(--ok)]/20 status-ok"
                                  : attachment.status === 'uploading'
                                  ? "bg-[var(--info)]/20 status-info"
                                  : "bg-[var(--err)]/20 status-error"
                              )}>
                                {attachment.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Text */}
                      <div className="prose prose-sm max-w-none">
                        {message.content}
                      </div>

                      {/* Citations */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-medium text-muted">
                            Sources:
                          </div>
                          {message.citations.map((citation) => (
                            <div
                              key={citation.id}
                              className="flex items-center gap-2 p-2 bg-[var(--muted)]/30 rounded-[var(--radius-sm)] cursor-pointer hover:bg-[var(--muted)]/50 transition-standard"
                            >
                              <BookOpen size={14} className="status-info" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {citation.title}
                                </div>
                                <div className="text-xs text-muted">
                                  {citation.source}
                                  {citation.page && ` - Page ${citation.page}`}
                                </div>
                              </div>
                              <div className="text-xs status-info">
                                {Math.round(citation.relevance * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Copy size={14} />}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ThumbsUp size={14} />}
                        >
                          Good
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ThumbsDown size={14} />}
                        >
                          Bad
                        </Button>
                        {message.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Download size={14} />}
                          >
                            Export
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                <Bot size={16} className="text-primary" />
              </div>
              <Card variant="glass" className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-sm text-muted">AI is thinking...</span>
                </div>
              </Card>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="glass border-t border-[var(--glass-border)] p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question or describe what you need help with..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                rightIcon={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip size={16} />
                  </Button>
                }
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.csv,.xml,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() && attachments.length === 0}
              leftIcon={<Send size={16} />}
            >
              Send
            </Button>
          </div>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium text-primary">
                Attachments:
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 bg-[var(--muted)]/50 rounded-[var(--radius-md)]"
                  >
                    {getFileIcon(attachment.type)}
                    <span className="text-sm">{attachment.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Panel */}
      {showContextPanel && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="w-80 glass border-l border-[var(--glass-border)] p-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">
                Context
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContextPanel(false)}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Resident Info */}
            <Card variant="glass" className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="status-info" />
                <span className="font-medium text-primary">Resident</span>
              </div>
              {context.resident ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{context.resident.name}</div>
                  <div className="text-muted">Room {context.resident.room}</div>
                  <div className="text-muted">{context.resident.unit}</div>
                </div>
              ) : (
                <div className="text-sm text-muted">
                  No resident selected
                </div>
              )}
            </Card>

            {/* Facility Info */}
            <Card variant="glass" className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="status-info" />
                <span className="font-medium text-primary">Facility</span>
              </div>
              {context.facility ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{context.facility.name}</div>
                  <div className="text-muted">{context.facility.state}</div>
                </div>
              ) : (
                <div className="text-sm text-muted">
                  {userProfile?.facility_name || 'No facility selected'}
                </div>
              )}
            </Card>

            {/* Policy Info */}
            <Card variant="glass" className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="status-info" />
                <span className="font-medium text-primary">Policy</span>
              </div>
              {context.policy ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{context.policy.title}</div>
                  {context.policy.fTag && (
                    <div className="text-muted">F-Tag: {context.policy.fTag}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted">
                  No policy selected
                </div>
              )}
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedChatPage;
