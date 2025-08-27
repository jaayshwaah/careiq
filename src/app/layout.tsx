/* 
   FILE: src/app/layout.tsx
   Complete fixed version with proper theme handling and SSR safety
*/

import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "AI-powered nursing home compliance and operations assistant",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CareIQ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialChats: any[] = [];

  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      style={{
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      <head>
        {/* Prevent theme flash with inline script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('careiq-theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = false;
                  
                  if (theme === 'dark') {
                    isDark = true;
                  } else if (theme === 'light') {
                    isDark = false;
                  } else {
                    // Default to system preference or light
                    isDark = systemDark;
                  }
                  
                  document.documentElement.classList.add(isDark ? 'dark' : 'light');
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) {
                  // Fallback to light theme
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
        
        {/* PWA and mobile optimizations */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ThemeProvider 
          defaultTheme="system" 
          enableSystem
          storageKey="careiq-theme"
        >
          <AppShell initialChats={initialChats}>
            {children}
          </AppShell>
        </ThemeProvider>
        
        {/* Global loading indicator styles */}
        <style jsx global>{`
          /* Custom scrollbar styles for consistency across browsers */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          
          ::-webkit-scrollbar-thumb {
            background: var(--border-primary);
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: var(--text-tertiary);
          }
          
          /* Improve font rendering on all devices */
          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Prevent layout shift during font loading */
          html {
            font-display: swap;
          }
          
          /* Focus visible improvements for accessibility */
          *:focus-visible {
            outline: 2px solid var(--accent-blue);
            outline-offset: 2px;
          }
          
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              transition-delay: 0s !important;
            }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            :root {
              --border-primary: rgba(0, 0, 0, 0.3);
              --text-secondary: #000000;
            }
            
            :root.dark {
              --border-primary: rgba(255, 255, 255, 0.3);
              --text-secondary: #ffffff;
            }
          }
          
          /* Loading skeleton animation */
          @keyframes skeleton-loading {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: calc(200px + 100%) 0;
            }
          }
          
          .skeleton {
            background: linear-gradient(90deg, 
              var(--bg-secondary) 25%, 
              var(--bg-overlay) 37%, 
              var(--bg-secondary) 63%
            );
            background-size: 400px 100%;
            animation: skeleton-loading 1.4s ease-in-out infinite;
          }
        `}</style>
      </body>
    </html>
  );
}