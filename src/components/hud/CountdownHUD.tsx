import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Share2, Users, Clock, Check, Home } from 'lucide-react'
import type { PresenceUser } from '../../lib/types'

interface CountdownHUDProps {
  roomId: string
  title: string
  secondsRemaining: number
  presenceUsers: PresenceUser[]
  onBurnClick: () => void
  isCreator: boolean
}

export const CountdownHUD: React.FC<CountdownHUDProps> = ({
  roomId,
  title,
  secondsRemaining,
  presenceUsers,
  onBurnClick,
  isCreator,
}) => {
  const [copied, setCopied] = useState(false)

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00'
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 60
  const isCritical = secondsRemaining > 0 && secondsRemaining <= 15

  return (
    <div className="fixed top-3 left-3 right-3 z-30 pointer-events-none flex flex-col sm:flex-row items-center justify-between gap-2.5">
      {/* Left panel: Room Identity & Brand */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#0c0e17]/85 backdrop-blur-md border border-slate-800/80 rounded-xl px-3.5 py-2 shadow-lg">
        <Link
          to="/"
          title="Return to Base"
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
        <div className="h-4 w-px bg-slate-800" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-white tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
              {title}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/50">
              #{roomId.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>

      {/* Center panel: Self-Destruct Countdown HUD */}
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md transition-all shadow-lg ${
          isCritical
            ? 'bg-amber-950/90 border-2 border-amber-500 text-amber-100 animate-pulse glow-amber'
            : isUrgent
            ? 'bg-amber-950/80 border border-amber-500 text-amber-200 glow-amber'
            : 'bg-[#0c0e17]/85 border border-slate-800/80 text-slate-100'
        }`}
      >
        <Clock className={`w-4 h-4 ${isUrgent ? 'text-amber-400 animate-spin' : 'text-amber-400'}`} />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            {isCritical ? 'CRITICAL EXPIRATION' : isUrgent ? 'IMMINENT PURGE' : 'TIME REMAINING'}
          </span>
          <span
            className={`font-mono text-lg sm:text-xl font-black tracking-widest ${
              isCritical ? 'text-amber-400 text-glow-amber' : isUrgent ? 'text-amber-400' : 'text-amber-300 text-glow-amber'
            }`}
          >
            {formatTime(secondsRemaining)}
          </span>
        </div>
      </div>

      {/* Right panel: Controls & Presence */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#0c0e17]/85 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-1.5 shadow-lg">
        {/* Presence Counter */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-mono"
          title={`${presenceUsers.length} connected operative${presenceUsers.length === 1 ? '' : 's'}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
          </span>
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{presenceUsers.length}</span>
        </div>

        {/* Share Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 text-xs font-mono transition-colors"
          title="Copy Link to Clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-yellow-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
        </button>

        {/* Burn Now Kill Switch */}
        <button
          onClick={onBurnClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900/90 border border-amber-800/60 text-amber-300 hover:text-amber-100 text-xs font-mono font-medium transition-colors glow-amber"
          title={isCreator ? 'Creator Kill Switch: Purge this room now' : 'Emergency Purge'}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Burn Now</span>
        </button>
      </div>
    </div>
  )
}
