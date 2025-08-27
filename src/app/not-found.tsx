// src/app/not-found.tsx
// Fixed version without ThemeProvider dependency

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Page Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bg-primary: #f8f9fb;
              --text-primary: #1a1a1a;
              --accent-blue: #007aff;
            }
            
            @media (prefers-color-scheme: dark) {
              :root {
                --bg-primary: #0a0a0a;
                --text-primary: #ffffff;
                --accent-blue: #0a84ff;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
          `
        }} />
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), #0056b3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              404
            </div>
            
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              margin: '0 0 1rem 0',
              color: 'var(--text-primary)'
            }}>
              Page Not Found
            </h1>
            
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '2rem',
              lineHeight: '1.6',
              margin: '0 0 2rem 0'
            }}>
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '12px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--accent-blue), #0056b3)',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span style={{ marginRight: '0.5rem' }}>🏠</span>
              Go Home
            </a>
          </div>
          
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af',
            margin: 0
          }}>
            Need help? Contact support or visit our documentation.
          </p>
        </div>
      </body>
    </html>
  );
}