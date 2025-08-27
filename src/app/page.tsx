// src/app/page.tsx - Fixed with proper scrolling and no big logo
import { AuthStatus } from "@/components/AuthProvider";

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Main Header - Clean and Simple */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to CareIQ
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your AI-powered nursing home compliance and operations assistant.
          </p>
        </div>
        
        {/* Auth Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-colors">
          <AuthStatus />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon="🤖"
            title="AI Chat Assistant"
            description="Ask questions about compliance, regulations, and operations"
          />
          <FeatureCard 
            icon="📋"
            title="Compliance Tracking"
            description="Stay on top of deadlines and requirements"
          />
          <FeatureCard 
            icon="📚"
            title="Knowledge Base"
            description="Access facility-specific policies and procedures"
          />
          <FeatureCard 
            icon="📊"
            title="Real-time Guidance"
            description="Get answers tailored to your role and facility"
          />
          <FeatureCard 
            icon="🔍"
            title="Document Search"
            description="Quickly find relevant regulations and policies"
          />
          <FeatureCard 
            icon="⚡"
            title="Quick Actions"
            description="Generate reports, checklists, and training materials"
          />
        </div>

        {/* Getting Started Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Getting Started
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Complete Your Profile</h3>
                <p className="text-gray-600 dark:text-gray-300">Set your role, facility name, and state for personalized responses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Start a New Chat</h3>
                <p className="text-gray-600 dark:text-gray-300">Click the "New Chat" button to begin asking questions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Upload Documents</h3>
                <p className="text-gray-600 dark:text-gray-300">Add your facility's policies and procedures for personalized guidance</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm transition-colors">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusItem label="API Services" status="operational" />
            <StatusItem label="AI Chat" status="operational" />
            <StatusItem label="Document Search" status="operational" />
            <StatusItem label="Knowledge Base" status="operational" />
          </div>
        </div>

        {/* Footer padding */}
        <div className="pb-8" />
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: string; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  );
}

function StatusItem({ 
  label, 
  status 
}: { 
  label: string; 
  status: 'operational' | 'degraded' | 'down'; 
}) {
  const statusColors = {
    operational: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    down: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  const statusIcons = {
    operational: '✅',
    degraded: '⚠️',
    down: '❌'
  };

  return (
    <div className="text-center">
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${statusColors[status]}`}>
        {statusIcons[status]} {status === 'operational' ? 'Online' : status}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}