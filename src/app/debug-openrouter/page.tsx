// src/app/debug-openrouter/page.tsx
"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

type DebugResult = {
  step: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: any;
};

export default function DebugOpenRouterPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testing, setTesting] = useState(false);

  async function runDiagnostics() {
    setTesting(true);
    setResults([]);
    
    const addResult = (result: DebugResult) => {
      setResults(prev => [...prev, result]);
    };

    // Step 1: Check environment variables
    addResult({
      step: "Environment Check",
      status: 'loading',
      message: "Checking if OPENROUTER_API_KEY is set..."
    });

    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      
      addResult({
        step: "Environment Check",
        status: healthData.env?.hasOpenRouter ? 'success' : 'error',
        message: healthData.env?.hasOpenRouter 
          ? "✅ OPENROUTER_API_KEY is configured"
          : "❌ OPENROUTER_API_KEY is missing",
        details: healthData.env
      });
    } catch (error) {
      addResult({
        step: "Environment Check", 
        status: 'error',
        message: "❌ Could not check environment variables",
        details: error
      });
    }

    // Step 2: Test OpenRouter connection
    addResult({
      step: "OpenRouter Connection",
      status: 'loading', 
      message: "Testing connection to OpenRouter API..."
    });

    try {
      const debugRes = await fetch('/api/debug/openrouter');
      const debugData = await debugRes.json();
      
      addResult({
        step: "OpenRouter Connection",
        status: debugData.ok ? 'success' : 'error',
        message: debugData.ok 
          ? `✅ ${debugData.message}`
          : `❌ ${debugData.message}`,
        details: debugData.details
      });
    } catch (error) {
      addResult({
        step: "OpenRouter Connection",
        status: 'error',
        message: "❌ Could not reach OpenRouter debug endpoint",
        details: error
      });
    }

    // Step 3: Test actual chat completion
    addResult({
      step: "Chat Completion Test",
      status: 'loading',
      message: "Testing actual chat completion..."
    });

    try {
      const testRes = await fetch('/api/test-openrouter');
      const testData = await testRes.json();
      
      addResult({
        step: "Chat Completion Test", 
        status: testData.ok ? 'success' : 'error',
        message: testData.ok 
          ? "✅ Chat completion working"
          : `❌ Chat completion failed (${testData.status})`,
        details: {
          status: testData.status,
          model: testData.model,
          sample: testData.sample
        }
      });
    } catch (error) {
      addResult({
        step: "Chat Completion Test",
        status: 'error', 
        message: "❌ Network error testing chat completion",
        details: error
      });
    }

    // Step 4: Test with CareIQ chat endpoint
    addResult({
      step: "CareIQ Chat Test",
      status: 'loading',
      message: "Testing CareIQ chat endpoint..."
    });

    try {
      const careiqRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello, this is a test message.' }]
        })
      });

      const careiqData = await careiqRes.json();
      
      addResult({
        step: "CareIQ Chat Test",
        status: careiqData.error ? 'error' : 'success',
        message: careiqData.error 
          ? `❌ CareIQ chat failed: ${careiqData.error}`
          : "✅ CareIQ chat endpoint working",
        details: careiqData
      });
    } catch (error) {
      addResult({
        step: "CareIQ Chat Test",
        status: 'error',
        message: "❌ Error testing CareIQ chat endpoint", 
        details: error
      });
    }

    setTesting(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OpenRouter Debug</h1>
        <p className="text-gray-600">Diagnose issues with your OpenRouter API integration</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {result.status === 'loading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      {result.step}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.status === 'success' 
                        ? 'bg-green-100 text-green-800'
                        : result.status === 'error'
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600">
                    {result.message}
                  </p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Show Details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Fixes Section */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-4">Common Fixes</h2>
        <div className="space-y-3 text-sm">
          <div>
            <h3 className="font-medium text-yellow-800">🔑 Invalid API Key</h3>
            <p className="text-yellow-700">Go to OpenRouter.ai → API Keys → Generate new key → Update in Vercel → Redeploy</p>
          </div>
          
          <div>
            <h3 className="font-medium text-yellow-800">💳 Insufficient Credits</h3>
            <p className="text-yellow-700">Go to OpenRouter.ai → Billing → Add credits (minimum $5 recommended)</p>
          </div>
          
          <div>
            <h3 className="font-medium text-yellow-800">🔧 Environment Variable Missing</h3>
            <p className="text-yellow-700">Vercel Dashboard → Your Project → Settings → Environment Variables → Add OPENROUTER_API_KEY → Redeploy</p>
          </div>
          
          <div>
            <h3 className="font-medium text-yellow-800">🚀 Deployment Issue</h3>
            <p className="text-yellow-700">After updating environment variables, you MUST redeploy for changes to take effect</p>
          </div>
        </div>
      </div>
    </div>
  );
}