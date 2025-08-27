/* 
   FILE: src/app/page.tsx  
   Ultra-minimal version to test basic functionality
*/

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          CareIQ
        </h1>
        <p className="text-gray-600 mb-6">
          Application is loading successfully.
        </p>
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div className="w-full h-2 bg-green-500 rounded-full"></div>
        </div>
        <p className="text-sm text-green-600 mt-2">✓ No JavaScript errors</p>
      </div>
    </main>
  );
}