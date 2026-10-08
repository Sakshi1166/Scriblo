import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CountdownHUD } from '../components/hud/CountdownHUD'
import { BurnModal } from '../components/hud/BurnModal'
import { DeadDropCanvas, type DeadDropCanvasHandle } from '../components/canvas/DeadDropCanvas'
import { GlitchOverlay } from '../components/ui/GlitchOverlay'
import { TerminatedView } from '../components/ui/TerminatedView'
import type { Room, PresenceUser } from '../lib/types'
import { NEON_COLORS } from '../lib/types'
import { sound } from '../lib/audio'
import { Lock, ArrowRight, Loader2 } from 'lucide-react'

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const { user, clientId, clientName, loading: authLoading } = useAuth()

  // Room state
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTerminated, setIsTerminated] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchReason, setGlitchReason] = useState('TIME-TO-LIVE EXPIRED')

  // Passcode unlock state
  const [isPasscodeLocked, setIsPasscodeLocked] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  // Countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const expiresAtRef = useRef<number>(0)

  // Burn modal
  const [burnModalOpen, setBurnModalOpen] = useState(false)
  const [isBurning, setIsBurning] = useState(false)

  // Presence
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])

  // Ref to canvas handle
  const canvasRef = useRef<DeadDropCanvasHandle | null>(null)

  // Pick deterministic neon color for current user
  const userColor = useMemo(() => {
    let hash = 0
    const str = clientId || 'agent'
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % NEON_COLORS.length
    return NEON_COLORS[index]
  }, [clientId])

  // Trigger self-destruction sequence
  const triggerSelfDestruct = useCallback((reason = 'TIME-TO-LIVE EXPIRED') => {
    if (isGlitching || isTerminated) return
    setGlitchReason(reason)
    setIsGlitching(true)
  }, [isGlitching, isTerminated])

  const handlePresenceUsersChange = useCallback((users: PresenceUser[]) => {
    setPresenceUsers(users)
  }, [])

  const handleBurnBroadcastReceived = useCallback(() => {
    triggerSelfDestruct('EMERGENCY BURN PROTOCOL')
  }, [triggerSelfDestruct])

  // 1. Fetch Room Record
  useEffect(() => {
    if (!roomId) return
    let mounted = true

    async function fetchRoom() {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId as string)
          .single()

        if (fetchError || !data) {
          console.warn('Room not found or expired by RLS:', fetchError)
          if (mounted) {
            setIsTerminated(true)
            setLoading(false)
          }
          return
        }

        const roomRecord = data as unknown as Room
        const expTime = new Date(roomRecord.expires_at).getTime()
        const now = Date.now()

        // Check if expired
        if (expTime <= now) {
          if (mounted) {
            setIsTerminated(true)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setRoom(roomRecord)
          expiresAtRef.current = expTime
          setSecondsRemaining(Math.max(0, Math.floor((expTime - now) / 1000)))

          if (roomRecord.passcode) {
            setIsPasscodeLocked(true)
          }
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Failed to load room:', err)
        if (mounted) {
          setIsTerminated(true)
          setLoading(false)
        }
      }
    }

    fetchRoom()

    return () => {
      mounted = false
    }
  }, [roomId])

  // 2. Countdown Interval
  useEffect(() => {
    if (!room || isTerminated || isGlitching) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000))
      setSecondsRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        triggerSelfDestruct('TIME-TO-LIVE EXPIRED')
      } else if (remaining === 60) {
        sound.playWarningPulse()
      } else if (remaining <= 10) {
        sound.playCriticalCount()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [room, isTerminated, isGlitching, triggerSelfDestruct])

  // Handle Passcode Unlock
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (room && passcodeInput.trim() === room.passcode) {
      setIsPasscodeLocked(false)
      setPasscodeError(false)
      sound.playBeep(880, 0.1, 'sine')
    } else {
      setPasscodeError(true)
      sound.playBeep(220, 0.2, 'sawtooth')
    }
  }

  // Handle Manual Room Burn
  const handleConfirmBurn = async () => {
    if (!roomId) return
    setIsBurning(true)

    try {
      // 1. Broadcast burn event to all peers
      if (canvasRef.current) {
        await canvasRef.current.broadcastBurn()
      }

      // 2. Delete room row from Supabase
      await supabase.from('rooms').delete().eq('id', roomId as string)

      // 3. Trigger local self-destruct sequence
      setBurnModalOpen(false)
      triggerSelfDestruct('MANUAL BURN OVERRIDE')
    } catch (err) {
      console.error('Failed to burn room:', err)
      setIsBurning(false)
      triggerSelfDestruct('MANUAL BURN OVERRIDE')
    }
  }

  // Loading Screen
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
          Decrypting Dead-Drop Channel...
        </span>
      </div>
    )
  }

  // Post-Destruction Terminated Screen
  if (isTerminated) {
    return <TerminatedView roomId={roomId} reason={glitchReason} />
  }

  // Passcode Lock Gate
  if (isPasscodeLocked) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-md w-full bg-[#0d101a] border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-cyan-400" />
          </div>

          <h2 className="text-xl font-mono font-bold text-white mb-1">RESTRICTED VAULT</h2>
          <p className="text-slate-400 text-xs mb-6 font-mono">
            Enter authorized passphrase to unlock this dead-drop whiteboard.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value)
                  setPasscodeError(false)
                }}
                placeholder="Passphrase"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#06070a] border border-slate-800 text-center font-mono text-sm text-white tracking-widest focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {passcodeError && (
              <p className="text-xs font-mono text-red-400">
                Invalid passphrase. Access denied.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-mono text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>ACCESS DROP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    )
  }


  // Active Canvas Room
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08090d]">
      {/* Glitch Disintegration Overlay during self-destruction */}
      {isGlitching && (
        <GlitchOverlay
          reason={glitchReason}
          onComplete={() => {
            setIsGlitching(false)
            setIsTerminated(true)
          }}
        />
      )}

      {/* Floating Countdown HUD */}
      {room && (
        <CountdownHUD
          roomId={room.id}
          title={room.title}
          secondsRemaining={secondsRemaining}
          presenceUsers={presenceUsers}
          onBurnClick={() => setBurnModalOpen(true)}
          isCreator={room.created_by === user?.id}
        />
      )}

      {/* Tldraw Canvas Engine */}
      {room && !isGlitching && (
        <DeadDropCanvas
          ref={canvasRef}
          roomId={room.id}
          initialCanvasState={room.canvas_state}
          currentUserId={clientId}
          currentUserName={clientName}
          currentUserColor={userColor}
          onPresenceUsersChange={handlePresenceUsersChange}
          onBurnBroadcastReceived={handleBurnBroadcastReceived}
        />
      )}

      {/* Confirmation Burn Modal */}
      <BurnModal
        isOpen={burnModalOpen}
        onClose={() => setBurnModalOpen(false)}
        onConfirm={handleConfirmBurn}
        isBurning={isBurning}
      />
    </div>
  )
}
