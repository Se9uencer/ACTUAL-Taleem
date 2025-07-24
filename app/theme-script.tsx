export function ThemeScript() {
  // Generate the script to apply theme from localStorage immediately
  // This prevents flash of wrong color while the React app loads
  const script = `
    (function() {
      try {
        // Always start with purple for unauthenticated state
        // The settings context will load user's saved color after authentication check
        var root = document.documentElement;
        
        // Apply purple color CSS variable immediately
        root.style.setProperty('--primary', 'var(--color-purple)');
        root.setAttribute('data-accent', 'purple');
        
        // Set purple as initial value in localStorage (will be updated by settings context if user is logged in)
        localStorage.setItem('taleem-color', 'purple');
      } catch (e) {
        // Fallback to purple if anything goes wrong
        try {
          var root = document.documentElement;
          root.style.setProperty('--primary', 'var(--color-purple)');
          root.setAttribute('data-accent', 'purple');
          localStorage.setItem('taleem-color', 'purple');
        } catch (fallbackError) {
          // Do nothing if even the fallback fails
        }
      }
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: script,
      }}
    />
  )
} 