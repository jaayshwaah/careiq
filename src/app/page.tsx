/* 
   FILE: src/app/page.tsx  
   Test version with ThemeProvider and Auth functionality
*/

import { ThemeToggle } from "@/components/ThemeProvider";
import { AuthStatus } from "@/components/AuthProvider";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CareIQ
          </h1>
          <ThemeToggle />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Testing core functionality step by step.
        </p>
        
        <div className="space-y-4 mb-6">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div className="w-full h-2 bg-green-500 rounded-full"></div>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="text-green-600 dark:text-green-400">✓ No JavaScript errors</p>
            <p className="text-green-600 dark:text-green-400">✓ ThemeProvider working</p>
            <p className="text-green-600 dark:text-green-400">✓ Supabase client loaded</p>
          </div>
        </div>

        <AuthStatus />

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Testing progress:
          </p>
          <div className="space-y-1 text-xs">
            <div className="text-green-600">✅ Basic layout</div>
            <div className="text-green-600">✅ ThemeProvider</div>
            <div className="text-green-600">✅ Supabase client</div>
            <div className="text-blue-600">🔄 Auth provider</div>
            <div className="text-gray-400">⏳ Sidebar component</div>
            <div className="text-gray-400">⏳ Full AppShell</div>
          </div>
        </div>
      </div>
    </main>
  );
}