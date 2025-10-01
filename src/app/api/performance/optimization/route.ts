// Performance Optimization API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface PerformanceOptimizationRequest {
  optimization_type: 'database' | 'cache' | 'queries' | 'indexes' | 'comprehensive';
  target_areas?: string[];
  performance_thresholds?: {
    query_time_maximum: number;
    cache_hit_ratio_minimum: number;
    response_time_maximum: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      optimization_type,
      target_areas,
      performance_thresholds
    }: PerformanceOptimizationRequest = await req.json();

    if (!optimization_type) {
      return NextResponse.json({ error: "Optimization type is required" }, { status: 400 });
    }

    // Perform performance optimization
    const optimizationResult = await performOptimization({
      optimization_type,
      target_areas,
      performance_thresholds,
      supa
    });

    // Store optimization results
    const { data: optimizationRecord, error: dbError } = await supa
      .from('performance_optimizations')
      .insert({
        user_id: user.id,
        optimization_type,
        target_areas: target_areas || [],
        performance_thresholds: performance_thresholds || {},
        optimization_result: optimizationResult,
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing optimization results:', dbError);
    }

    return NextResponse.json({
      optimization_result: optimizationResult,
      optimization_id: optimizationRecord?.id,
      message: "Performance optimization completed successfully"
    });

  } catch (error: any) {
    console.error('Performance optimization error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function performOptimization({
  optimization_type,
  target_areas,
  performance_thresholds,
  supa
}: {
  optimization_type: string;
  target_areas?: string[];
  performance_thresholds?: any;
  supa: any;
}) {
  const optimizationResult: any = {
    optimization_type,
    performance_metrics: {},
    optimizations_applied: [],
    recommendations: [],
    performance_improvements: {},
    execution_time: 0
  };

  const startTime = Date.now();

  try {
    switch (optimization_type) {
      case 'database':
        await optimizeDatabase(supa, optimizationResult);
        break;
      
      case 'cache':
        await optimizeCache(supa, optimizationResult);
        break;
      
      case 'queries':
        await optimizeQueries(supa, optimizationResult);
        break;
      
      case 'indexes':
        await optimizeIndexes(supa, optimizationResult);
        break;
      
      case 'comprehensive':
        await optimizeDatabase(supa, optimizationResult);
        await optimizeCache(supa, optimizationResult);
        await optimizeQueries(supa, optimizationResult);
        await optimizeIndexes(supa, optimizationResult);
        break;
      
      default:
        throw new Error(`Unknown optimization type: ${optimization_type}`);
    }

    optimizationResult.execution_time = Date.now() - startTime;
    return optimizationResult;

  } catch (error) {
    console.error('Optimization error:', error);
    optimizationResult.execution_time = Date.now() - startTime;
    optimizationResult.error = error instanceof Error ? error.message : 'Unknown error';
    return optimizationResult;
  }
}

async function optimizeDatabase(supa: any, result: any) {
  const dbOptimizations: any[] = [];
  const recommendations: any[] = [];

  try {
    // Analyze table sizes and identify optimization opportunities
    const tableAnalysis = await analyzeTablePerformance(supa);
    
    // Identify large tables that could benefit from partitioning
    const largeTables = tableAnalysis.filter((table: any) => table.size_mb > 100);
    if (largeTables.length > 0) {
      dbOptimizations.push({
        type: 'table_partitioning',
        description: 'Identified large tables for potential partitioning',
        tables: largeTables.map((t: any) => t.table_name),
        impact: 'high'
      });
      
      recommendations.push({
        priority: 'medium',
        category: 'database',
        title: 'Consider Table Partitioning',
        description: `Large tables (${largeTables.map((t: any) => t.table_name).join(', ')}) could benefit from partitioning`,
        expected_improvement: '20-40% query performance'
      });
    }

    // Identify unused indexes
    const unusedIndexes = await identifyUnusedIndexes(supa);
    if (unusedIndexes.length > 0) {
      dbOptimizations.push({
        type: 'index_cleanup',
        description: 'Identified unused indexes for removal',
        indexes: unusedIndexes,
        impact: 'medium'
      });
      
      recommendations.push({
        priority: 'low',
        category: 'database',
        title: 'Remove Unused Indexes',
        description: `Remove ${unusedIndexes.length} unused indexes to improve write performance`,
        expected_improvement: '5-15% write performance'
      });
    }

    // Analyze query patterns
    const queryAnalysis = await analyzeQueryPatterns(supa);
    if (queryAnalysis.slow_queries.length > 0) {
      dbOptimizations.push({
        type: 'query_optimization',
        description: 'Identified slow queries for optimization',
        queries: queryAnalysis.slow_queries,
        impact: 'high'
      });
    }

    result.optimizations_applied.push(...dbOptimizations);
    result.recommendations.push(...recommendations);
    result.performance_metrics.database = {
      tables_analyzed: tableAnalysis.length,
      large_tables: largeTables.length,
      unused_indexes: unusedIndexes.length,
      slow_queries: queryAnalysis.slow_queries.length
    };

  } catch (error) {
    console.error('Database optimization error:', error);
  }
}

async function optimizeCache(supa: any, result: any) {
  const cacheOptimizations: any[] = [];
  const recommendations: any[] = [];

  try {
    // Analyze cache hit ratios
    const cacheAnalysis = await analyzeCachePerformance(supa);
    
    // Identify frequently accessed data for caching
    const frequentQueries = await identifyFrequentQueries(supa);
    
    if (frequentQueries.length > 0) {
      cacheOptimizations.push({
        type: 'query_caching',
        description: 'Identified frequent queries for caching',
        queries: frequentQueries.slice(0, 10), // Top 10
        impact: 'high'
      });
      
      recommendations.push({
        priority: 'high',
        category: 'cache',
        title: 'Implement Query Caching',
        description: `Cache results for ${frequentQueries.length} frequently executed queries`,
        expected_improvement: '50-80% response time'
      });
    }

    // Identify data that could benefit from materialized views
    const materializedViewCandidates = await identifyMaterializedViewCandidates(supa);
    if (materializedViewCandidates.length > 0) {
      cacheOptimizations.push({
        type: 'materialized_views',
        description: 'Identified candidates for materialized views',
        candidates: materializedViewCandidates,
        impact: 'medium'
      });
      
      recommendations.push({
        priority: 'medium',
        category: 'cache',
        title: 'Create Materialized Views',
        description: `Create materialized views for ${materializedViewCandidates.length} complex queries`,
        expected_improvement: '30-60% query performance'
      });
    }

    result.optimizations_applied.push(...cacheOptimizations);
    result.recommendations.push(...recommendations);
    result.performance_metrics.cache = {
      cache_hit_ratio: cacheAnalysis.hit_ratio,
      frequent_queries: frequentQueries.length,
      materialized_view_candidates: materializedViewCandidates.length
    };

  } catch (error) {
    console.error('Cache optimization error:', error);
  }
}

async function optimizeQueries(supa: any, result: any) {
  const queryOptimizations: any[] = [];
  const recommendations: any[] = [];

  try {
    // Analyze query performance
    const queryAnalysis = await analyzeQueryPerformance(supa);
    
    // Identify N+1 query problems
    const nPlusOneQueries = await identifyNPlusOneQueries(supa);
    if (nPlusOneQueries.length > 0) {
      queryOptimizations.push({
        type: 'n_plus_one_fix',
        description: 'Identified N+1 query problems',
        queries: nPlusOneQueries,
        impact: 'high'
      });
      
      recommendations.push({
        priority: 'high',
        category: 'queries',
        title: 'Fix N+1 Query Problems',
        description: `Fix ${nPlusOneQueries.length} N+1 query patterns`,
        expected_improvement: '60-90% query performance'
      });
    }

    // Identify missing joins
    const missingJoins = await identifyMissingJoins(supa);
    if (missingJoins.length > 0) {
      queryOptimizations.push({
        type: 'join_optimization',
        description: 'Identified missing joins',
        queries: missingJoins,
        impact: 'medium'
      });
    }

    // Identify inefficient WHERE clauses
    const inefficientWhereClauses = await identifyInefficientWhereClauses(supa);
    if (inefficientWhereClauses.length > 0) {
      queryOptimizations.push({
        type: 'where_clause_optimization',
        description: 'Identified inefficient WHERE clauses',
        queries: inefficientWhereClauses,
        impact: 'medium'
      });
    }

    result.optimizations_applied.push(...queryOptimizations);
    result.recommendations.push(...recommendations);
    result.performance_metrics.queries = {
      total_queries_analyzed: queryAnalysis.total_queries,
      slow_queries: queryAnalysis.slow_queries.length,
      n_plus_one_queries: nPlusOneQueries.length,
      missing_joins: missingJoins.length,
      inefficient_where_clauses: inefficientWhereClauses.length
    };

  } catch (error) {
    console.error('Query optimization error:', error);
  }
}

async function optimizeIndexes(supa: any, result: any) {
  const indexOptimizations: any[] = [];
  const recommendations: any[] = [];

  try {
    // Analyze index usage
    const indexAnalysis = await analyzeIndexUsage(supa);
    
    // Identify missing indexes
    const missingIndexes = await identifyMissingIndexes(supa);
    if (missingIndexes.length > 0) {
      indexOptimizations.push({
        type: 'missing_indexes',
        description: 'Identified missing indexes',
        indexes: missingIndexes,
        impact: 'high'
      });
      
      recommendations.push({
        priority: 'high',
        category: 'indexes',
        title: 'Create Missing Indexes',
        description: `Create ${missingIndexes.length} missing indexes for better query performance`,
        expected_improvement: '40-70% query performance'
      });
    }

    // Identify duplicate indexes
    const duplicateIndexes = await identifyDuplicateIndexes(supa);
    if (duplicateIndexes.length > 0) {
      indexOptimizations.push({
        type: 'duplicate_indexes',
        description: 'Identified duplicate indexes',
        indexes: duplicateIndexes,
        impact: 'low'
      });
      
      recommendations.push({
        priority: 'low',
        category: 'indexes',
        title: 'Remove Duplicate Indexes',
        description: `Remove ${duplicateIndexes.length} duplicate indexes`,
        expected_improvement: '5-10% write performance'
      });
    }

    // Identify oversized indexes
    const oversizedIndexes = await identifyOversizedIndexes(supa);
    if (oversizedIndexes.length > 0) {
      indexOptimizations.push({
        type: 'oversized_indexes',
        description: 'Identified oversized indexes',
        indexes: oversizedIndexes,
        impact: 'medium'
      });
    }

    result.optimizations_applied.push(...indexOptimizations);
    result.recommendations.push(...recommendations);
    result.performance_metrics.indexes = {
      total_indexes: indexAnalysis.total_indexes,
      missing_indexes: missingIndexes.length,
      duplicate_indexes: duplicateIndexes.length,
      oversized_indexes: oversizedIndexes.length,
      unused_indexes: indexAnalysis.unused_indexes
    };

  } catch (error) {
    console.error('Index optimization error:', error);
  }
}

// Helper functions for analysis
async function analyzeTablePerformance(supa: any) {
  try {
    // Query actual table statistics from PostgreSQL
    const { data: tableStats, error } = await supa.rpc('get_table_statistics');
    
    if (error || !tableStats) {
      console.error('Error getting table statistics:', error);
      return [];
    }
    
    return tableStats.map((table: any) => ({
      table_name: table.table_name,
      size_mb: Math.round(table.size_bytes / 1024 / 1024),
      row_count: table.row_count
    }));
  } catch (error) {
    console.error('Error analyzing table performance:', error);
    return [];
  }
}

async function identifyUnusedIndexes(supa: any) {
  try {
    // Query actual unused indexes from PostgreSQL
    const { data: unusedIndexes, error } = await supa.rpc('get_unused_indexes');
    
    if (error || !unusedIndexes) {
      console.error('Error getting unused indexes:', error);
      return [];
    }
    
    return unusedIndexes.map((index: any) => ({
      index_name: index.index_name,
      table_name: index.table_name,
      usage_count: index.usage_count
    }));
  } catch (error) {
    console.error('Error identifying unused indexes:', error);
    return [];
  }
}

async function analyzeQueryPatterns(supa: any) {
  try {
    // Query actual slow queries from PostgreSQL
    const { data: slowQueries, error } = await supa.rpc('get_slow_queries');
    
    if (error || !slowQueries) {
      console.error('Error getting slow queries:', error);
      return { slow_queries: [] };
    }
    
    return {
      slow_queries: slowQueries.map((query: any) => ({
        query: query.query_text,
        avg_time: query.avg_time,
        calls: query.calls,
        total_time: query.total_time
      }))
    };
  } catch (error) {
    console.error('Error analyzing query patterns:', error);
    return { slow_queries: [] };
  }
}

async function analyzeCachePerformance(supa: any) {
  try {
    // Query actual cache performance from analytics_cache table
    const { data: cacheStats, error } = await supa
      .from('analytics_cache')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error getting cache stats:', error);
      return { hit_ratio: 0, total_requests: 0, cache_hits: 0 };
    }
    
    const totalRequests = cacheStats.length;
    const cacheHits = cacheStats.filter(c => c.expires_at > new Date()).length;
    const hitRatio = totalRequests > 0 ? cacheHits / totalRequests : 0;
    
    return {
      hit_ratio: hitRatio,
      total_requests: totalRequests,
      cache_hits: cacheHits
    };
  } catch (error) {
    console.error('Error analyzing cache performance:', error);
    return { hit_ratio: 0, total_requests: 0, cache_hits: 0 };
  }
}

async function identifyFrequentQueries(supa: any) {
  try {
    // Query actual frequent queries from PostgreSQL
    const { data: frequentQueries, error } = await supa.rpc('get_frequent_queries');
    
    if (error || !frequentQueries) {
      console.error('Error getting frequent queries:', error);
      return [];
    }
    
    return frequentQueries.map((query: any) => ({
      query: query.query_text,
      frequency: query.calls,
      avg_time: query.avg_time
    }));
  } catch (error) {
    console.error('Error identifying frequent queries:', error);
    return [];
  }
}

async function identifyMaterializedViewCandidates(supa: any) {
  try {
    // Query actual materialized view candidates from PostgreSQL
    const { data: candidates, error } = await supa.rpc('get_materialized_view_candidates');
    
    if (error || !candidates) {
      console.error('Error getting materialized view candidates:', error);
      return [];
    }
    
    return candidates.map((candidate: any) => ({
      query: candidate.query_text,
      benefit: candidate.benefit_level,
      estimated_improvement: candidate.estimated_improvement
    }));
  } catch (error) {
    console.error('Error identifying materialized view candidates:', error);
    return [];
  }
}

async function analyzeQueryPerformance(supa: any) {
  try {
    // Query actual query performance from PostgreSQL
    const { data: queryStats, error } = await supa.rpc('get_query_performance_stats');
    
    if (error || !queryStats) {
      console.error('Error getting query performance stats:', error);
      return { total_queries: 0, slow_queries: [] };
    }
    
    return {
      total_queries: queryStats.total_queries || 0,
      slow_queries: queryStats.slow_queries || []
    };
  } catch (error) {
    console.error('Error analyzing query performance:', error);
    return { total_queries: 0, slow_queries: [] };
  }
}

async function identifyNPlusOneQueries(supa: any) {
  try {
    // Query actual N+1 query patterns from PostgreSQL
    const { data: nPlusOneQueries, error } = await supa.rpc('get_n_plus_one_queries');
    
    if (error || !nPlusOneQueries) {
      console.error('Error getting N+1 queries:', error);
      return [];
    }
    
    return nPlusOneQueries.map((query: any) => ({
      pattern: query.pattern,
      impact: query.impact_level,
      frequency: query.frequency
    }));
  } catch (error) {
    console.error('Error identifying N+1 queries:', error);
    return [];
  }
}

async function identifyMissingJoins(supa: any) {
  try {
    // Query actual missing joins from PostgreSQL
    const { data: missingJoins, error } = await supa.rpc('get_missing_joins');
    
    if (error || !missingJoins) {
      console.error('Error getting missing joins:', error);
      return [];
    }
    
    return missingJoins.map((join: any) => ({
      query: join.query_text,
      impact: join.impact_level,
      suggested_join: join.suggested_join
    }));
  } catch (error) {
    console.error('Error identifying missing joins:', error);
    return [];
  }
}

async function identifyInefficientWhereClauses(supa: any) {
  try {
    const { data: inefficientClauses, error } = await supa.rpc('get_inefficient_where_clauses');
    if (error || !inefficientClauses) return [];
    return inefficientClauses.map((clause: any) => ({
      query: clause.query_text,
      impact: clause.impact_level,
      suggestion: clause.optimization_suggestion
    }));
  } catch (error) {
    return [];
  }
}

async function analyzeIndexUsage(supa: any) {
  try {
    const { data: indexStats, error } = await supa.rpc('get_index_usage_stats');
    if (error || !indexStats) return { total_indexes: 0, unused_indexes: 0, frequently_used: 0 };
    return {
      total_indexes: indexStats.total_indexes || 0,
      unused_indexes: indexStats.unused_indexes || 0,
      frequently_used: indexStats.frequently_used || 0
    };
  } catch (error) {
    return { total_indexes: 0, unused_indexes: 0, frequently_used: 0 };
  }
}

async function identifyMissingIndexes(supa: any) {
  try {
    const { data: missingIndexes, error } = await supa.rpc('get_missing_indexes');
    if (error || !missingIndexes) return [];
    return missingIndexes.map((index: any) => ({
      table: index.table_name,
      column: index.column_name,
      impact: index.impact_level
    }));
  } catch (error) {
    return [];
  }
}

async function identifyDuplicateIndexes(supa: any) {
  try {
    const { data: duplicates, error } = await supa.rpc('get_duplicate_indexes');
    if (error || !duplicates) return [];
    return duplicates.map((dup: any) => ({
      index1: dup.index1_name,
      index2: dup.index2_name,
      table: dup.table_name
    }));
  } catch (error) {
    return [];
  }
}

async function identifyOversizedIndexes(supa: any) {
  try {
    const { data: oversized, error } = await supa.rpc('get_oversized_indexes');
    if (error || !oversized) return [];
    return oversized.map((index: any) => ({
      index: index.index_name,
      size_mb: Math.round(index.size_bytes / 1024 / 1024),
      table: index.table_name
    }));
  } catch (error) {
    return [];
  }
}
