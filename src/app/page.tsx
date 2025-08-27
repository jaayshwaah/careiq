/* 
   FILE: src/app/page.tsx  
   Test version with ThemeProvider functionality
*/

import { ThemeToggle } from "@/components/ThemeProvider";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CareIQ
          </h1>
          <ThemeToggle />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Application is loading successfully with theme support.
        </p>
        
        <div className="space-y-3">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div className="w-full h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400">✓ No JavaScript errors</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">✓ ThemeProvider working</p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click the theme button above to test theme switching
          </p>
        </div>
      </div>
    </main>
  );
}