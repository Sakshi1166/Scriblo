import React from 'react'
import { Flame, AlertOctagon, X } from 'lucide-react'

interface BurnModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isBurning: boolean
}

export const BurnModal: React.FC<BurnModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isBurning,
}) => {
  if (!isOpen) return null

  return (
    <div className="air-burn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full bg-[#0d0f17] border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(245,185,66,0.18)] text-center">
        <button
          onClick={onClose}
          disabled={isBurning}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <Flame className="w-7 h-7 text-amber-500 animate-pulse" />
        </div>

        <h2 className="text-xl font-mono font-bold text-white mb-2 flex items-center justify-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          <span>CONFIRM IMMEDIATE BURN</span>
        </h2>

        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          Executing this command will immediately purge this room from Supabase, drop all database rows, and disconnect all connected operatives with an emergency disintegration sequence.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isBurning}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-mono text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBurning}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-yellow-300 text-black font-mono text-sm font-semibold shadow-[0_0_20px_rgba(245,185,66,0.25)] transition-all flex items-center justify-center gap-2"
          >
            {isBurning ? (
              <span>Purging...</span>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Burn Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
