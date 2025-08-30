// src/lib/smartRouter.ts - Intelligent model routing for cost optimization
import { supabaseService } from "@/lib/supabase/server";

export interface RoutingContext {
  messageLength: number;
  isFirstMessage: boolean;
  userRole?: string;
  taskType: 'chat' | 'title' | 'document' | 'analysis' | 'compliance';
  complexity?: 'simple' | 'medium' | 'complex';
  priority?: 'low' | 'medium' | 'high';
}

export interface ModelConfig {
  name: string;
  costPer1kTokens: number;
  maxTokens: number;
  strengths: string[];
  weaknesses: string[];
}

// Model configurations with current pricing (approximate)
const MODELS: Record<string, ModelConfig> = {
  'openai/gpt-5-chat': {
    name: 'ChatGPT-5',
    costPer1kTokens: 0.060, // Estimated pricing
    maxTokens: 8192,
    strengths: ['complex reasoning', 'medical knowledge', 'compliance'],
    weaknesses: ['high cost']
  },
  'openai/gpt-4o': {
    name: 'GPT-4o',
    costPer1kTokens: 0.015,
    maxTokens: 4096,
    strengths: ['general knowledge', 'structured output'],
    weaknesses: ['moderate cost']
  },
  'anthropic/claude-3-sonnet': {
    name: 'Claude-3 Sonnet',
    costPer1kTokens: 0.015,
    maxTokens: 4096,
    strengths: ['analysis', 'safety', 'reasoning'],
    weaknesses: ['moderate cost']
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude-3 Haiku',
    costPer1kTokens: 0.0025,
    maxTokens: 4096,
    strengths: ['speed', 'simple tasks', 'low cost'],
    weaknesses: ['limited complex reasoning']
  },
  'meta-llama/llama-3.1-8b-instruct': {
    name: 'Llama 3.1 8B',
    costPer1kTokens: 0.0015,
    maxTokens: 2048,
    strengths: ['very low cost', 'basic tasks'],
    weaknesses: ['limited capabilities']
  },
  'google/gemini-flash-1.5': {
    name: 'Gemini Flash',
    costPer1kTokens: 0.001,
    maxTokens: 2048,
    strengths: ['ultra low cost', 'speed'],
    weaknesses: ['basic capabilities']
  }
};

// Smart routing rules
export function selectOptimalModel(context: RoutingContext): string {
  const { taskType, messageLength, complexity, priority, isFirstMessage } = context;

  // Force GPT-5 for complex healthcare compliance tasks
  if (taskType === 'compliance' || 
      (taskType === 'chat' && (complexity === 'complex' || priority === 'high'))) {
    return 'openai/gpt-5-chat';
  }

  // Use cheapest models for titling
  if (taskType === 'title') {
    return 'meta-llama/llama-3.1-8b-instruct';
  }

  // For document analysis, use medium-tier models
  if (taskType === 'document' || taskType === 'analysis') {
    return complexity === 'complex' ? 'openai/gpt-5-chat' : 'anthropic/claude-3-sonnet';
  }

  // For regular chat, optimize based on message characteristics
  if (taskType === 'chat') {
    // Short messages or simple questions
    if (messageLength < 100 && complexity !== 'complex') {
      return 'anthropic/claude-3-haiku';
    }

    // Medium complexity conversations
    if (messageLength < 500 && complexity !== 'complex') {
      return 'openai/gpt-4o';
    }

    // Default to GPT-5 for main chat interactions
    return 'openai/gpt-5-chat';
  }

  // Fallback to GPT-5
  return 'openai/gpt-5-chat';
}

// Analyze message complexity
export function analyzeComplexity(message: string, chatHistory?: any[]): RoutingContext['complexity'] {
  const length = message.length;
  const words = message.split(/\s+/).length;
  
  // Keywords that indicate complexity
  const complexKeywords = [
    'regulation', 'compliance', 'cms', 'survey', 'assessment', 'policy',
    'analysis', 'compare', 'evaluate', 'calculate', 'determine'
  ];
  
  const simpleKeywords = [
    'what', 'when', 'where', 'how', 'define', 'list'
  ];

  const hasComplex = complexKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  const hasSimple = simpleKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  // Complex if long message or complex keywords
  if (length > 500 || words > 80 || hasComplex) {
    return 'complex';
  }
  
  // Simple if short and basic keywords
  if (length < 50 || (words < 10 && hasSimple)) {
    return 'simple';
  }
  
  return 'medium';
}

// Estimate token usage and cost
export function estimateCost(message: string, model: string, responseTokens: number = 500): number {
  const modelConfig = MODELS[model];
  if (!modelConfig) return 0;

  // Rough token estimation (4 chars per token average)
  const inputTokens = Math.ceil(message.length / 4);
  const totalTokens = inputTokens + responseTokens;
  
  return (totalTokens / 1000) * modelConfig.costPer1kTokens;
}

// Log routing decisions for analysis
export async function logRoutingDecision(
  chatId: string,
  selectedModel: string,
  context: RoutingContext,
  estimatedCost: number
) {
  try {
    const supabase = supabaseService();
    await supabase.from('routing_logs').insert({
      chat_id: chatId,
      model_selected: selectedModel,
      task_type: context.taskType,
      complexity: context.complexity,
      message_length: context.messageLength,
      estimated_cost: estimatedCost,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the main request if logging fails
    console.warn('Failed to log routing decision:', error);
  }
}

// Get routing recommendations for admin dashboard
export async function getRoutingStats(timeframe: 'day' | 'week' | 'month' = 'day') {
  try {
    const supabase = supabaseService();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('routing_logs')
      .select('model_selected, estimated_cost, task_type, complexity')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Aggregate stats
    const stats = data?.reduce((acc, log) => {
      acc.totalCost += log.estimated_cost || 0;
      acc.modelUsage[log.model_selected] = (acc.modelUsage[log.model_selected] || 0) + 1;
      acc.taskTypes[log.task_type] = (acc.taskTypes[log.task_type] || 0) + 1;
      return acc;
    }, {
      totalCost: 0,
      modelUsage: {} as Record<string, number>,
      taskTypes: {} as Record<string, number>
    });

    return stats;
  } catch (error) {
    console.error('Failed to get routing stats:', error);
    return null;
  }
}