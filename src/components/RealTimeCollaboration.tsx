"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  Video, 
  Phone, 
  Share2, 
  Mic, 
  MicOff,
  VideoOff,
  VideoIcon,
  Settings,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen?: string;
  cursor?: {
    x: number;
    y: number;
    color: string;
  };
}

export interface CollaborationMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'action';
}

interface RealTimeCollaborationProps {
  documentId: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'editor' | 'viewer';
  };
  onCollaboratorJoin?: (collaborator: Collaborator) => void;
  onCollaboratorLeave?: (collaboratorId: string) => void;
  onMessage?: (message: CollaborationMessage) => void;
}

const RealTimeCollaboration: React.FC<RealTimeCollaborationProps> = ({
  documentId,
  currentUser,
  onCollaboratorJoin,
  onCollaboratorLeave,
  onMessage
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulate real-time updates (in production, use WebSocket or similar)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate collaborator updates
      if (Math.random() > 0.7) {
        const newCollaborator: Collaborator = {
          id: `user-${Date.now()}`,
          name: `User ${Math.floor(Math.random() * 100)}`,
          role: ['admin', 'editor', 'viewer'][Math.floor(Math.random() * 3)] as any,
          isOnline: true,
          cursor: {
            x: Math.random() * 800,
            y: Math.random() * 600,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          }
        };
        
        setCollaborators(prev => {
          const exists = prev.find(c => c.id === newCollaborator.id);
          if (!exists) {
            onCollaboratorJoin?.(newCollaborator);
            return [...prev, newCollaborator];
          }
          return prev;
        });
      }

      // Simulate cursor movements
      setCollaborators(prev => prev.map(collaborator => ({
        ...collaborator,
        cursor: collaborator.cursor ? {
          ...collaborator.cursor,
          x: collaborator.cursor.x + (Math.random() - 0.5) * 10,
          y: collaborator.cursor.y + (Math.random() - 0.5) * 10
        } : undefined
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [onCollaboratorJoin]);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);
  };

  const toggleVideo = () => {
    if (isVideoEnabled) {
      stopVideo();
    } else {
      startVideo();
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: CollaborationMessage = {
      id: `msg-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    onMessage?.(message);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col space-y-4">
        {/* Collaborators List */}
        <div className="bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Collaborators</h3>
            <span className="text-xs text-muted">{collaborators.length} online</span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {collaborators.map(collaborator => (
              <motion.div
                key={collaborator.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {collaborator.name.charAt(0)}
                  </div>
                  {collaborator.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {collaborator.name}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {collaborator.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Video/Audio Controls */}
        <div className="bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] p-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVideo}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isVideoEnabled 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-[var(--muted)] text-primary hover:bg-[var(--muted)]/80"
              )}
            >
              {isVideoEnabled ? <VideoOff size={16} /> : <VideoIcon size={16} />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isAudioEnabled 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-[var(--muted)] text-primary hover:bg-[var(--muted)]/80"
              )}
            >
              {isAudioEnabled ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showChat 
                  ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" 
                  : "bg-[var(--muted)] text-primary hover:bg-[var(--muted)]/80"
              )}
            >
              <MessageCircle size={16} />
            </button>
            
            <button
              onClick={() => setIsSharing(!isSharing)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isSharing 
                  ? "bg-green-500 text-white hover:bg-green-600" 
                  : "bg-[var(--muted)] text-primary hover:bg-[var(--muted)]/80"
              )}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Video Preview */}
        {isVideoEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] p-4"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-48 h-36 rounded-lg bg-black"
            />
          </motion.div>
        )}

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] w-80"
            >
              <div className="p-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-primary">Chat</h3>
              </div>
              
              <div className="h-64 overflow-y-auto p-4 space-y-2">
                {messages.map(message => (
                  <div key={message.id} className="flex space-x-2">
                    <div className="w-6 h-6 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-xs">
                      {message.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-primary">
                          {message.userName}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-primary">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-[var(--border)]">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RealTimeCollaboration;
