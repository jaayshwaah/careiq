"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Save, 
  Trash2, 
  Settings,
  ArrowRight,
  GitBranch,
  Clock,
  Mail,
  Database,
  FileText,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification';
  position: { x: number; y: number };
  data: {
    title: string;
    description?: string;
    config?: Record<string, any>;
  };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  type: 'success' | 'error' | 'conditional';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface WorkflowCanvasProps {
  workflow: Workflow;
  onUpdate: (workflow: Workflow) => void;
  onSave: (workflow: Workflow) => void;
  onExecute: (workflow: Workflow) => void;
}

const nodeTypes = {
  trigger: { icon: Play, color: 'bg-green-500', label: 'Trigger' },
  action: { icon: Settings, color: 'bg-blue-500', label: 'Action' },
  condition: { icon: GitBranch, color: 'bg-yellow-500', label: 'Condition' },
  delay: { icon: Clock, color: 'bg-purple-500', label: 'Delay' },
  notification: { icon: Mail, color: 'bg-orange-500', label: 'Notification' }
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onUpdate,
  onSave,
  onExecute
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNode = useCallback((type: WorkflowNode['type'], position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {
        title: `${nodeTypes[type].label} ${workflow.nodes.length + 1}`,
        description: `Configure this ${nodeTypes[type].label.toLowerCase()}`,
        config: {}
      }
    };

    onUpdate({
      ...workflow,
      nodes: [...workflow.nodes, newNode]
    });
  }, [workflow, onUpdate]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    onUpdate({
      ...workflow,
      nodes: workflow.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    });
  }, [workflow, onUpdate]);

  const deleteNode = useCallback((nodeId: string) => {
    onUpdate({
      ...workflow,
      nodes: workflow.nodes.filter(node => node.id !== nodeId),
      connections: workflow.connections.filter(
        conn => conn.source !== nodeId && conn.target !== nodeId
      )
    });
  }, [workflow, onUpdate]);

  const addConnection = useCallback((source: string, target: string, type: WorkflowConnection['type'] = 'success') => {
    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      source,
      target,
      type
    };

    onUpdate({
      ...workflow,
      connections: [...workflow.connections, newConnection]
    });
  }, [workflow, onUpdate]);

  const deleteConnection = useCallback((connectionId: string) => {
    onUpdate({
      ...workflow,
      connections: workflow.connections.filter(conn => conn.id !== connectionId)
    });
  }, [workflow, onUpdate]);

  const handleNodeDrag = useCallback((nodeId: string, position: { x: number; y: number }) => {
    updateNode(nodeId, { position });
  }, [updateNode]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  }, [selectedNode]);

  const handleConnectionStart = useCallback((nodeId: string) => {
    setIsConnecting(true);
    setConnectionStart(nodeId);
  }, []);

  const handleConnectionEnd = useCallback((nodeId: string) => {
    if (isConnecting && connectionStart && connectionStart !== nodeId) {
      addConnection(connectionStart, nodeId);
    }
    setIsConnecting(false);
    setConnectionStart(null);
  }, [isConnecting, connectionStart, addConnection]);

  const getNodeIcon = (type: WorkflowNode['type']) => {
    const Icon = nodeTypes[type].icon;
    return <Icon size={20} />;
  };

  const getConnectionColor = (type: WorkflowConnection['type']) => {
    switch (type) {
      case 'success': return 'stroke-green-500';
      case 'error': return 'stroke-red-500';
      case 'conditional': return 'stroke-yellow-500';
      default: return 'stroke-gray-500';
    }
  };

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-64 bg-[var(--card)] border-r border-[var(--border)] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Workflow Designer</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => onSave(workflow)}
                className="p-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Save size={16} />
              </button>
              <button
                onClick={() => onExecute(workflow)}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Play size={16} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-primary mb-2">Add Nodes</h4>
            <div className="space-y-2">
              {Object.entries(nodeTypes).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addNode(type as WorkflowNode['type'], { x: 100, y: 100 })}
                  className="w-full flex items-center space-x-2 p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white", config.color)}>
                    {getNodeIcon(type as WorkflowNode['type'])}
                  </div>
                  <span className="text-sm text-primary">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedNode && (
            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="text-sm font-medium text-primary mb-2">Node Properties</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Node title"
                  className="w-full p-2 border border-[var(--border)] rounded-lg text-sm"
                  value={workflow.nodes.find(n => n.id === selectedNode)?.data.title || ''}
                  onChange={(e) => updateNode(selectedNode, {
                    data: {
                      ...workflow.nodes.find(n => n.id === selectedNode)?.data,
                      title: e.target.value
                    }
                  })}
                />
                <textarea
                  placeholder="Description"
                  className="w-full p-2 border border-[var(--border)] rounded-lg text-sm"
                  rows={3}
                  value={workflow.nodes.find(n => n.id === selectedNode)?.data.description || ''}
                  onChange={(e) => updateNode(selectedNode, {
                    data: {
                      ...workflow.nodes.find(n => n.id === selectedNode)?.data,
                      description: e.target.value
                    }
                  })}
                />
                <button
                  onClick={() => deleteNode(selectedNode)}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete Node</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full bg-[var(--bg)] relative"
          style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {workflow.connections.map(connection => {
              const sourceNode = workflow.nodes.find(n => n.id === connection.source);
              const targetNode = workflow.nodes.find(n => n.id === connection.target);
              
              if (!sourceNode || !targetNode) return null;

              const startX = sourceNode.position.x + 50;
              const startY = sourceNode.position.y + 25;
              const endX = targetNode.position.x + 50;
              const endY = targetNode.position.y + 25;

              return (
                <line
                  key={connection.id}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="currentColor"
                  strokeWidth="2"
                  className={getConnectionColor(connection.type)}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          <AnimatePresence>
            {workflow.nodes.map(node => {
              const config = nodeTypes[node.type];
              const isSelected = selectedNode === node.id;
              
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    "absolute w-24 h-12 rounded-lg border-2 cursor-pointer transition-all",
                    config.color,
                    isSelected ? "ring-2 ring-[var(--accent)]" : "",
                    isConnecting && connectionStart === node.id ? "ring-2 ring-yellow-500" : ""
                  )}
                  style={{
                    left: node.position.x,
                    top: node.position.y
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseDown={() => handleConnectionStart(node.id)}
                  onMouseUp={() => handleConnectionEnd(node.id)}
                  drag
                  onDrag={(_, info) => {
                    handleNodeDrag(node.id, {
                      x: node.position.x + info.delta.x,
                      y: node.position.y + info.delta.y
                    });
                  }}
                >
                  <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                    {config.label}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;
