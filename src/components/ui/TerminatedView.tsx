import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Terminal, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react'

interface TerminatedViewProps {
  roomId?: string
  reason?: string
}

export const TerminatedView: React.FC<TerminatedViewProps> = ({
  roomId = 'UNKNOWN',
  reason = 'Time-To-Live Expired',
}) => {
  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-60 pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full border border-red-500/30 bg-[#0e1017]/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(255,42,95,0.15)] text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-wider mb-6">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Security Protocol 404: Terminated</span>
        </div>

        {/* Big terminal icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <Trash2 className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mb-2 tracking-tight">
          ASSET PERMANENTLY PURGED
        </h1>

        <p className="text-slate-400 text-sm sm:text-base mb-6 leading-relaxed">
          This dead-drop room and all associated canvas strokes, shapes, and uploaded assets have expired and have been permanently sanitized from Supabase storage and memory.
        </p>

        {/* Telemetry / Audit readout */}
        <div className="bg-[#08090d] border border-slate-800 rounded-xl p-4 text-left font-mono text-xs text-slate-400 mb-6 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Terminal className="w-3.5 h-3.5" /> Room Reference:
            </span>
            <span className="text-slate-200 font-bold tracking-wider">{roomId}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500">Purge Trigger:</span>
            <span className="text-red-400 font-semibold">{reason}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500">Storage Zeroization:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Complete (0 Residuals)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Database RLS:</span>
            <span className="text-cyan-400">Strict Read/Write Reject Active</span>
          </div>
        </div>

        {/* Action Button */}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-mono text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Generate New Dead-Drop Room</span>
        </Link>
      </div>
    </div>
  )
}
