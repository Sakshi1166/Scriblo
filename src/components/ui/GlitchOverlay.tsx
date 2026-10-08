import React, { useEffect } from 'react'
import { AlertTriangle, Flame } from 'lucide-react'
import { sound } from '../../lib/audio'

interface GlitchOverlayProps {
  onComplete?: () => void
  reason?: string
}

export const GlitchOverlay: React.FC<GlitchOverlayProps> = ({ onComplete, reason = 'TIME-TO-LIVE EXPIRED' }) => {
  useEffect(() => {
    sound.playSelfDestruct()
    const timer = setTimeout(() => {
      onComplete?.()
    }, 2800)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden animate-disintegrate">
      {/* Scanlines effect */}
      <div className="absolute inset-0 scanlines" />

      {/* Cyberpunk warning box */}
      <div className="relative z-10 border-2 border-red-500/80 bg-red-950/80 p-8 rounded-lg shadow-[0_0_50px_rgba(255,42,95,0.7)] text-center max-w-lg mx-4">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-600/30 rounded-full border border-red-400 animate-pulse">
            <Flame className="w-12 h-12 text-red-500 animate-bounce" />
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2 text-red-400 font-mono tracking-widest text-sm uppercase mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>SECURITY PROTOCOL ACTIVATED</span>
          <AlertTriangle className="w-4 h-4" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white mb-2 font-mono" style={{ textShadow: '0 0 10px #ff2a5f, 0 0 20px #ff2a5f' }}>
          PURGING DROP ASSETS
        </h1>

        <p className="text-red-300 font-mono text-sm mb-4">
          TRIGGER: <span className="text-white font-bold">{reason}</span>
        </p>

        <div className="w-full bg-red-900/50 rounded-full h-2.5 overflow-hidden border border-red-500/50">
          <div className="bg-gradient-to-r from-red-500 via-orange-400 to-red-600 h-full w-full animate-[pulse_0.4s_infinite]" />
        </div>

        <p className="text-xs text-red-400/80 font-mono mt-4 uppercase">
          Zero-residual zeroization in progress... Unmounting canvas.
        </p>
      </div>
    </div>
  )
}
