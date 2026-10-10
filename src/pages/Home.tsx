import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import confetti from 'canvas-confetti'
import {
  Clock,
  Lock,
  ArrowRight,
  Flame,
  Radio,
  FileImage,
  Database,
  Terminal,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TTL_OPTIONS, type TtlOption, type RoomInsert } from '../lib/types'
import { sound } from '../lib/audio'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [selectedTtl, setSelectedTtl] = useState<TtlOption>(TTL_OPTIONS[0])
  const [passcode, setPasscode] = useState('')
  const [usePasscode, setUsePasscode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      sound.playBeep(660, 0.08, 'triangle')

      const roomId = nanoid(10)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + selectedTtl.minutes * 60 * 1000)

      const roomData: RoomInsert = {
        id: roomId,
        title: title.trim() || `Drop-${roomId.slice(0, 6).toUpperCase()}`,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id || null,
        passcode: usePasscode && passcode.trim() ? passcode.trim() : null,
        canvas_state: {},
      }

      const { error } = await supabase.from('rooms').insert(roomData)

      if (error) {
        console.error('Failed to create room:', error)
        setErrorMessage(error.message || 'Failed to initialize dead-drop room.')
        setIsSubmitting(false)
        return
      }

      // Trigger celebratory tactical confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#f5b942', '#00ff9d', '#ffb800'],
      })

      // Navigate to room
      setTimeout(() => {
        navigate(`/room/${roomId}`)
      }, 350)
    } catch (err: any) {
      console.error('Error creating room:', err)
      setErrorMessage(err.message || 'An unexpected error occurred.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="air-home min-h-screen bg-black text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glowing orbs & scanlines */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-amber-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#090b12]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center glow-amber">
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="font-control font-bold tracking-wider text-white text-base">
              SCRIBLO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
          <span className={`flex items-center gap-1.5 ${isSupabaseConfigured ? 'text-yellow-400' : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-yellow-500 animate-pulse' : 'bg-slate-600'}`} />
            {isSupabaseConfigured ? 'Supabase Vault Online' : 'Supabase Setup Required'}
          </span>
        </div>
      </header>

      {/* Main hero & creator section */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 flex flex-col items-center text-center">
        {/* Hero title */}
        <h1 className="air-display text-4xl sm:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
          A shared canvas.<br />
          <span>Here for a while.</span>
        </h1>

        <p className="text-slate-400 max-w-2xl text-base sm:text-lg mb-10 leading-relaxed font-sans">
          Sketch ideas together in real time. Rooms expire automatically when their timer runs out.
        </p>

        {/* Room Generator Card */}
        <motion.div
          className="air-home-form w-full max-w-xl bg-[#0d101a]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.6)] text-left relative overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          whileHover={{ y: -4 }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <form onSubmit={handleCreateRoom} className="space-y-6">
            {/* Room Title */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Room Codename / Title</span>
                <span className="text-slate-500 lowercase">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Project Orion Architecture"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-[#07080d] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-sm transition-all"
                />
                <Terminal className="w-4 h-4 text-slate-600 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Time-To-Live Selector */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Self-Destruct Window (TTL)</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TTL_OPTIONS.map((option) => {
                  const isSelected = selectedTtl.minutes === option.minutes
                  return (
                    <button
                      key={option.minutes}
                      type="button"
                      onClick={() => {
                        setSelectedTtl(option)
                        sound.playBeep(520, 0.04, 'sine')
                      }}
                      className={`py-3 px-2 rounded-xl font-mono text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 glow-amber scale-[1.02]'
                          : 'bg-[#07080d] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-sm font-bold">{option.label.split(' ')[0]}</span>
                      <span className="text-[10px] text-slate-500 lowercase">{option.label.split(' ')[1]}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] font-mono text-amber-400/80 mt-2 flex items-center gap-1">
                <span>⚡</span> {selectedTtl.description} — purged exactly at T+{selectedTtl.minutes}m
              </p>
            </div>

            {/* Optional Passcode */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setUsePasscode(!usePasscode)}
                  className="text-xs font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{usePasscode ? 'Passcode Protection Enabled' : 'Add Passcode Lock? (Optional)'}</span>
                </button>
              </div>

              {usePasscode && (
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter secret room passphrase"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#07080d] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono transition-all"
                />
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-mono">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl font-mono text-sm font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 shadow-[0_0_30px_rgba(245,185,66,0.4)] transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>INITIALIZING SECURE DROP...</span>
              ) : (
                <>
                  <span>GENERATE DEAD-DROP ROOM</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Feature Grid */}
        <div className="air-home-features grid grid-cols-1 md:grid-cols-4 gap-4 mt-12 w-full max-w-4xl text-left">
          <div className="bg-[#0b0d14]/70 border border-slate-800/80 rounded-xl p-4">
            <Flame className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="font-mono text-sm font-bold text-white mb-1">Strict RLS Purge</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Postgres Row-Level Security immediately blocks any reads or updates after expiry.
            </p>
          </div>

          <div className="bg-[#0b0d14]/70 border border-slate-800/80 rounded-xl p-4">
            <Radio className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="font-mono text-sm font-bold text-white mb-1">Realtime Broadcast</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Low-latency strokes and multiplayer live cursors stream directly between peers.
            </p>
          </div>

          <div className="bg-[#0b0d14]/70 border border-slate-800/80 rounded-xl p-4">
            <Database className="w-5 h-5 text-yellow-400 mb-2" />
            <h3 className="font-mono text-sm font-bold text-white mb-1">Debounced Vault</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Canvas shapes are snapshot-serialized and persisted to Postgres JSONB every 3 seconds.
            </p>
          </div>

          <div className="bg-[#0b0d14]/70 border border-slate-800/80 rounded-xl p-4">
            <FileImage className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="font-mono text-sm font-bold text-white mb-1">Asset Drops</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Drag-and-drop screenshots and schematics straight into Supabase storage.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="air-home-footer relative z-10 border-t border-slate-800/60 py-4 px-6 text-center font-mono text-xs text-slate-500">
        Ephemeral Dead-Drop Whiteboard • Supabase Realtime & Postgres Engine
      </footer>
    </div>
  )
}
