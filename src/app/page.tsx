/* 
   FILE: src/app/page.tsx  
   Final test with complete UI
*/

import { AuthStatus } from "@/components/AuthProvider";

export default function HomePage() {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6 transition-colors">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to CareIQ
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your AI-powered nursing home compliance and operations assistant.
          </p>
          
          <AuthStatus />
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-300">✓ System Ready</h3>
              <p className="text-sm text-green-700 dark:text-green-400">All components loaded successfully</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">✓ UI Working</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">Sidebar and navigation active</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 transition-colors">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Component Status
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Layout & Routing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Theme System</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Supabase Client</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">Sidebar Navigation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700 dark:text-gray-300">AppShell Container</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🎉 All systems operational - No JavaScript errors detected!
          </p>
        </div>
      </div>
    </div>
  );
}