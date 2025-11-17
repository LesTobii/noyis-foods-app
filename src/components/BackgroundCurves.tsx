import React from 'react'

/**
 * BackgroundCurves: Modern gradient mesh background with subtle animated blobs
 * - GPU-accelerated with transform
 * - Respects prefers-reduced-motion
 * - No interference with UI (pointer-events: none)
 */

const BackgroundCurves: React.FC = () => {
  return (
    <div className="background-worms" aria-hidden style={{background:'linear-gradient(135deg, #fbfff9 0%, #f0f9f6 25%, #fef7f0 50%, #fcfff9 75%, #f7fcfb 100%)',position:'fixed',inset:0,zIndex:-1,pointerEvents:'none'}}>
      {/* Animated gradient blobs */}
      <svg className="worm" style={{position:'fixed',width:'100%',height:'100%',top:0,left:0}} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="blur1">
            <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
          </filter>
          <radialGradient id="grad1" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#005f46" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#005f46" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad2" cx="70%" cy="60%">
            <stop offset="0%" stopColor="#b5651d" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#b5651d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad3" cx="50%" cy="80%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Blob 1 - Emerald, top left */}
        <circle cx="200" cy="150" r="280" fill="url(#grad1)" filter="url(#blur1)" 
          style={{animation:'drift1 15s ease-in-out infinite',transformOrigin:'200px 150px'}} />

        {/* Blob 2 - Orange, middle right */}
        <circle cx="1000" cy="400" r="320" fill="url(#grad2)" filter="url(#blur1)" 
          style={{animation:'drift2 18s ease-in-out infinite',transformOrigin:'1000px 400px'}} />

        {/* Blob 3 - Green, bottom center */}
        <circle cx="600" cy="700" r="300" fill="url(#grad3)" filter="url(#blur1)" 
          style={{animation:'drift3 20s ease-in-out infinite',transformOrigin:'600px 700px'}} />
      </svg>

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -15px) scale(1.05); }
          66% { transform: translate(-25px, 10px) scale(0.95); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.03); }
          66% { transform: translate(15px, -25px) scale(0.97); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, 15px) scale(1.02); }
          66% { transform: translate(-20px, -20px) scale(0.98); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes drift1, @keyframes drift2, @keyframes drift3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
          }
        }
      `}</style>
    </div>
  )
}

export default BackgroundCurves
