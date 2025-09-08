"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { 
  Plus, Save, Play, Settings, Trash2, Copy, RotateCcw, 
  CheckCircle, Clock, AlertTriangle, Bell, Zap, Users,
  ArrowRight, ArrowDown, GitBranch, PauseCircle, X,
  Workflow, Layers, Target, Calendar, User, FileText,
  ChevronDown, ChevronRight, Eye, Edit3, MoreHorizontal
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification' | 'end';
  position: { x: number; y: number };
  data: {
    title: string;
    description?: string;
    settings: any;
    category?: string;
    template_id?: string;
    assign_to_role?: string;
    assign_to_user_id?: string;
    due_offset_hours?: number;
    depends_on?: string[];
    parallel?: boolean;
  };
  connections: string[]; // Array of node IDs this node connects to
}

interface WorkflowCanvas {
  id?: string;
  name: string;
  description: string;
  trigger_type: 'manual' | 'event' | 'scheduled' | 'conditional';
  trigger_conditions: any;
  nodes: WorkflowNode[];
  is_active: boolean;
}

const NODE_TYPES = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: Zap,
    color: 'green',
    description: 'Start point for workflow'
  },
  {
    type: 'action',
    label: 'Create Task',
    icon: CheckCircle,
    color: 'blue',
    description: 'Create a new task'
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    color: 'yellow',
    description: 'Branch based on conditions'
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: PauseCircle,
    color: 'purple',
    description: 'Wait for specified time'
  },
  {
    type: 'notification',
    label: 'Notification',
    icon: Bell,
    color: 'orange',
    description: 'Send notification'
  },
  {
    type: 'end',
    label: 'End',
    icon: Target,
    color: 'gray',
    description: 'End point for workflow'
  }
];

const ADMISSION_TEMPLATE: WorkflowCanvas = {
  name: 'New Resident Admission',
  description: 'Automated workflow for new resident admissions',
  trigger_type: 'event',
  trigger_conditions: { event_type: 'new_admission' },
  is_active: true,
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        title: 'New Admission Event',
        description: 'Triggered when a new resident is admitted',
        settings: { event_type: 'new_admission' }
      },
      connections: ['action-1', 'action-2']
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 200, y: 200 },
      data: {
        title: 'Prepare Room',
        description: 'Clean and prepare resident room',
        settings: { priority: 'high' },
        category: 'housekeeping',
        assign_to_role: 'housekeeping',
        due_offset_hours: 2,
        parallel: true
      },
      connections: ['action-3']
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 600, y: 200 },
      data: {
        title: 'Initial Nursing Assessment',
        description: 'Complete comprehensive nursing assessment',
        settings: { priority: 'high' },
        category: 'clinical',
        assign_to_role: 'nursing',
        due_offset_hours: 24
      },
      connections: ['action-4']
    },
    {
      id: 'action-3',
      type: 'action',
      position: { x: 200, y: 350 },
      data: {
        title: 'Stock Medical Supplies',
        description: 'Stock room with necessary medical supplies',
        settings: { priority: 'medium' },
        category: 'housekeeping',
        assign_to_role: 'central_supply',
        due_offset_hours: 4,
        depends_on: ['action-1']
      },
      connections: ['notification-1']
    },
    {
      id: 'action-4',
      type: 'action',
      position: { x: 600, y: 350 },
      data: {
        title: 'Dietary Assessment',
        description: 'Complete dietary assessment and meal planning',
        settings: { priority: 'medium' },
        category: 'dietary',
        assign_to_role: 'dietary',
        due_offset_hours: 48,
        depends_on: ['action-2']
      },
      connections: ['notification-1']
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 400, y: 500 },
      data: {
        title: 'Admission Complete',
        description: 'Notify team that admission workflow is complete',
        settings: { 
          recipients: ['administrator', 'nursing_supervisor'],
          message: 'New resident admission workflow completed'
        }
      },
      connections: ['end-1']
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 400, y: 650 },
      data: {
        title: 'Workflow Complete',
        settings: {}
      },
      connections: []
    }
  ]
};

export default function WorkflowDesigner() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [workflow, setWorkflow] = useState<WorkflowCanvas>(ADMISSION_TEMPLATE);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showNodePanel, setShowNodePanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowCanvas[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkflows();
    }
  }, [isAuthenticated]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/tasks/workflows', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setSavedWorkflows(result.workflows || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      // Convert nodes to workflow steps format
      const workflowSteps = workflow.nodes
        .filter(node => node.type !== 'trigger' && node.type !== 'end')
        .map((node, index) => ({
          step_number: index + 1,
          step_type: node.type === 'action' ? 'create_task' : node.type,
          title: node.data.title,
          description: node.data.description,
          category: node.data.category,
          assign_to_role: node.data.assign_to_role,
          assign_to_user_id: node.data.assign_to_user_id,
          due_offset_hours: node.data.due_offset_hours,
          depends_on: node.data.depends_on,
          parallel: node.data.parallel,
          template_name: node.data.template_id,
          priority: node.data.settings?.priority || 'medium',
          settings: node.data.settings
        }));

      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        trigger_type: workflow.trigger_type,
        trigger_conditions: workflow.trigger_conditions,
        workflow_steps: workflowSteps
      };

      const url = workflow.id ? `/api/tasks/workflows/${workflow.id}` : '/api/tasks/workflows';
      const method = workflow.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflow(prev => ({ ...prev, id: result.workflow.id }));
        await loadWorkflows();
        alert('Workflow saved successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to save workflow:', error);
        alert('Failed to save workflow: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow');
    } finally {
      setSaving(false);
    }
  };

  const executeWorkflow = async () => {
    if (!workflow.id) {
      alert('Please save the workflow first');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/tasks/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          workflow_id: workflow.id,
          trigger_data: { manual_execution: true },
          context_data: { executed_by: user?.id }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Workflow executed successfully! Created ${result.created_tasks.length} tasks.`);
      } else {
        const error = await response.json();
        console.error('Failed to execute workflow:', error);
        alert('Failed to execute workflow: ' + error.error);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Error executing workflow');
    }
  };

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const nodeType = NODE_TYPES.find(nt => nt.type === type);
    if (!nodeType) return;

    const newNode: WorkflowNode = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      position: position || { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200 },
      data: {
        title: `New ${nodeType.label}`,
        description: nodeType.description,
        settings: {}
      },
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId 
          ? { ...node, ...updates }
          : node
      )
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          connections: node.connections.filter(connId => connId !== nodeId)
        }))
    }));
    setSelectedNode(null);
  }, []);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === fromId && !node.connections.includes(toId)
          ? { ...node, connections: [...node.connections, toId] }
          : node
      )
    }));
  }, []);

  const getNodeColor = (type: string) => {
    const nodeType = NODE_TYPES.find(nt => nt.type === type);
    switch (nodeType?.color) {
      case 'green': return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300';
      case 'yellow': return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300';
      case 'purple': return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300';
      case 'orange': return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300';
      default: return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-300';
    }
  };

  const getNodeIcon = (type: string) => {
    const nodeType = NODE_TYPES.find(nt => nt.type === type);
    const IconComponent = nodeType?.icon || CheckCircle;
    return <IconComponent className="h-5 w-5" />;
  };

  const renderNode = (node: WorkflowNode) => {
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div
        key={node.id}
        className={`absolute cursor-pointer transition-all duration-200 ${
          isSelected ? 'z-20 shadow-xl scale-105' : 'z-10 shadow-lg hover:shadow-xl'
        }`}
        style={{
          left: node.position.x * zoom + panOffset.x,
          top: node.position.y * zoom + panOffset.y,
          transform: `scale(${zoom})`
        }}
        onClick={() => setSelectedNode(node)}
        onMouseDown={(e) => {
          e.preventDefault();
          setDraggedNode(node);
          setIsDragging(true);
        }}
      >
        <div className={`
          relative bg-white dark:bg-gray-800 border-2 rounded-xl p-4 min-w-[200px] max-w-[250px]
          ${getNodeColor(node.type)}
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}>
          {/* Node Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0">
              {getNodeIcon(node.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {node.data.title}
              </h4>
              <p className="text-xs opacity-75 capitalize">
                {node.type}
              </p>
            </div>
            {isSelected && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle properties panel
                    setShowPropertiesPanel(true);
                  }}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <Settings className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="p-1 hover:bg-red-200 dark:hover:bg-red-900/20 rounded text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Node Content */}
          {node.data.description && (
            <p className="text-xs opacity-75 mb-3 line-clamp-2">
              {node.data.description}
            </p>
          )}

          {/* Node Metadata */}
          <div className="flex flex-wrap gap-1 text-xs">
            {node.data.assign_to_role && (
              <span className="px-2 py-1 bg-white/30 rounded">
                {node.data.assign_to_role}
              </span>
            )}
            {node.data.due_offset_hours && (
              <span className="px-2 py-1 bg-white/30 rounded">
                {node.data.due_offset_hours}h
              </span>
            )}
            {node.data.parallel && (
              <span className="px-2 py-1 bg-white/30 rounded">
                Parallel
              </span>
            )}
          </div>

          {/* Connection Points */}
          {node.type !== 'end' && (
            <div 
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                if (isConnecting && connectionStart) {
                  // End connection
                  connectNodes(connectionStart, node.id);
                  setIsConnecting(false);
                  setConnectionStart(null);
                } else {
                  // Start connection
                  setIsConnecting(true);
                  setConnectionStart(node.id);
                }
              }}
            >
              <Plus className="h-3 w-3 m-0.5 text-gray-500" />
            </div>
          )}
          
          {node.type !== 'trigger' && (
            <div 
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full"
            >
              <div className="w-2 h-2 bg-gray-400 rounded-full m-1"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConnections = () => {
    return workflow.nodes.map(node => 
      node.connections.map(targetId => {
        const targetNode = workflow.nodes.find(n => n.id === targetId);
        if (!targetNode) return null;

        const startX = (node.position.x + 100) * zoom + panOffset.x;
        const startY = (node.position.y + 60) * zoom + panOffset.y;
        const endX = (targetNode.position.x + 100) * zoom + panOffset.x;
        const endY = (targetNode.position.y + 20) * zoom + panOffset.y;

        const midY = startY + (endY - startY) / 2;

        return (
          <svg
            key={`${node.id}-${targetId}`}
            className="absolute inset-0 pointer-events-none z-5"
            style={{ width: '100%', height: '100%' }}
          >
            <path
              d={`M ${startX} ${startY} Q ${startX} ${midY} ${endX} ${endY}`}
              stroke="#6B7280"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
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
                  fill="#6B7280"
                />
              </marker>
            </defs>
          </svg>
        );
      })
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to access the workflow designer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Workflow className="h-8 w-8 text-blue-600" />
              <div>
                <input
                  type="text"
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white p-0"
                  placeholder="Workflow Name"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Zapier-style workflow designer
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{workflow.nodes.length} nodes</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{workflow.nodes.reduce((acc, node) => acc + node.connections.length, 0)} connections</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                −
              </button>
              <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                +
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={executeWorkflow}
                disabled={!workflow.id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-4 w-4" />
                Execute
              </button>
              <button
                onClick={saveWorkflow}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Panel */}
        {showNodePanel && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Node Types
            </h3>
            
            <div className="space-y-3">
              {NODE_TYPES.map((nodeType) => (
                <button
                  key={nodeType.type}
                  onClick={() => addNode(nodeType.type)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className={`p-2 rounded-lg ${getNodeColor(nodeType.type)}`}>
                    <nodeType.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {nodeType.label}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {nodeType.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Saved Workflows
            </h3>
            
            <div className="space-y-2">
              {savedWorkflows.map((savedWorkflow) => (
                <button
                  key={savedWorkflow.id}
                  onClick={() => {
                    // Load saved workflow
                    setWorkflow(savedWorkflow);
                  }}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {savedWorkflow.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {savedWorkflow.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
          <div
            ref={canvasRef}
            className="relative w-full h-full cursor-move"
            style={{
              backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
            }}
            onMouseDown={(e) => {
              if (e.target === canvasRef.current) {
                setIsDragging(true);
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && draggedNode) {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const newX = (e.clientX - rect.left - panOffset.x) / zoom - 100;
                  const newY = (e.clientY - rect.top - panOffset.y) / zoom - 30;
                  updateNode(draggedNode.id, {
                    position: { x: newX, y: newY }
                  });
                }
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
              setDraggedNode(null);
            }}
          >
            {/* Render connections */}
            {renderConnections()}
            
            {/* Render nodes */}
            {workflow.nodes.map(renderNode)}
            
            {/* Connection mode indicator */}
            {isConnecting && (
              <div className="absolute top-4 left-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Click on a node to connect from "{workflow.nodes.find(n => n.id === connectionStart)?.data.title}"
                </p>
                <button
                  onClick={() => {
                    setIsConnecting(false);
                    setConnectionStart(null);
                  }}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        {showPropertiesPanel && selectedNode && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Node Properties
              </h3>
              <button
                onClick={() => setShowPropertiesPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={selectedNode.data.title}
                  onChange={(e) => updateNode(selectedNode.id, {
                    data: { ...selectedNode.data, title: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedNode.data.description || ''}
                  onChange={(e) => updateNode(selectedNode.id, {
                    data: { ...selectedNode.data, description: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>

              {selectedNode.type === 'action' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={selectedNode.data.category || ''}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, category: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Select category</option>
                      <option value="clinical">Clinical</option>
                      <option value="administrative">Administrative</option>
                      <option value="housekeeping">Housekeeping</option>
                      <option value="dietary">Dietary</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="compliance">Compliance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assign to Role
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.assign_to_role || ''}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, assign_to_role: e.target.value }
                      })}
                      placeholder="e.g., nursing, housekeeping"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due in Hours
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.due_offset_hours || ''}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, due_offset_hours: parseInt(e.target.value) || 0 }
                      })}
                      placeholder="24"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedNode.data.parallel || false}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, parallel: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Can run in parallel
                      </span>
                    </label>
                  </div>
                </>
              )}

              {selectedNode.type === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delay Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={selectedNode.data.settings?.delay_hours || ''}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { 
                        ...selectedNode.data, 
                        settings: { 
                          ...selectedNode.data.settings, 
                          delay_hours: parseInt(e.target.value) || 0 
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}

              {selectedNode.type === 'notification' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipients
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.settings?.recipients?.join(', ') || ''}
                    onChange={(e) => updateNode(selectedNode.id, {
                      data: { 
                        ...selectedNode.data, 
                        settings: { 
                          ...selectedNode.data.settings, 
                          recipients: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                        }
                      }
                    })}
                    placeholder="administrator, nursing_supervisor"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Connections
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Connects to: </span>
                  {selectedNode.connections.length === 0 ? (
                    <span className="text-gray-500">None</span>
                  ) : (
                    selectedNode.connections.map(connId => {
                      const connectedNode = workflow.nodes.find(n => n.id === connId);
                      return connectedNode ? connectedNode.data.title : connId;
                    }).join(', ')
                  )}
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Connected from: </span>
                  {workflow.nodes.filter(n => n.connections.includes(selectedNode.id)).length === 0 ? (
                    <span className="text-gray-500">None</span>
                  ) : (
                    workflow.nodes
                      .filter(n => n.connections.includes(selectedNode.id))
                      .map(n => n.data.title)
                      .join(', ')
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
