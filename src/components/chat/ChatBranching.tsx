"use client";

import React, { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  MessageSquare, 
  ArrowRight, 
  X,
  Lightbulb,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Branch {
  id: string;
  messageId: string;
  content: string;
  createdAt: string;
  isActive: boolean;
}

interface ChatBranchingProps {
  messageId: string;
  branches: Branch[];
  onCreateBranch: (messageId: string, content: string) => void;
  onSwitchBranch: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
}

export default function ChatBranching({ 
  messageId, 
  branches, 
  onCreateBranch, 
  onSwitchBranch, 
  onDeleteBranch 
}: ChatBranchingProps) {
  const [showBranches, setShowBranches] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchContent, setNewBranchContent] = useState('');
  const [showTip, setShowTip] = useState(true);

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranchContent.trim()) {
      onCreateBranch(messageId, newBranchContent.trim());
      setNewBranchContent('');
      setShowCreateForm(false);
    }
  };

  const activeBranch = branches.find(b => b.isActive);
  const otherBranches = branches.filter(b => !b.isActive);

  return (
    <div className="relative">
      {/* Branching Button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowBranches(!showBranches)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          <span>Branches ({branches.length})</span>
          {showBranches ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1 px-2 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span>New Branch</span>
        </button>
      </div>

      {/* Tip Bubble */}
      {showTip && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Chat Branching:</strong> Create alternative conversation paths from any message. 
                Click "New Branch" to explore different responses or continue the conversation in a new direction.
              </p>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Branch Form */}
      {showCreateForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Create New Branch
          </h4>
          <form onSubmit={handleCreateBranch} className="space-y-3">
            <textarea
              value={newBranchContent}
              onChange={(e) => setNewBranchContent(e.target.value)}
              placeholder="Enter your alternative message or question..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              rows={3}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branches List */}
      {showBranches && (
        <div className="space-y-2 mb-4">
          {/* Active Branch */}
          {activeBranch && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-800 dark:text-green-200">
                      Current Branch
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {activeBranch.content}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {new Date(activeBranch.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Other Branches */}
          {otherBranches.map((branch) => (
            <div key={branch.id} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    {branch.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(branch.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => onSwitchBranch(branch.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <ArrowRight className="h-3 w-3" />
                    Switch
                  </button>
                  <button
                    onClick={() => onDeleteBranch(branch.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No branches yet</p>
              <p className="text-xs">Create a branch to explore alternative conversation paths</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
