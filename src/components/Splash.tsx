import React, { useEffect, useState } from 'react'

/**
 * Splash: Simple splash screen with logo and loading spinner
 * - Shows logo from src/assets
 * - Loading spinner underneath
 * - Fades out when app is ready
 */

const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Splash stays visible for 2 seconds, then fades out
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 400)
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(0, 95, 70, 0.04), rgba(181, 101, 29, 0.02))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'splashFadeOut 0.4s ease-in forwards',
        animationDelay: '2s'
      }}
    >
      <style>{`
        @keyframes splashFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Loading...
        </div>

        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 95, 70, 0.2)',
            borderTop: '3px solid #005f46',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
          aria-label="Loading"
        />
      </div>
    </div>
  )
}

export default Splash
