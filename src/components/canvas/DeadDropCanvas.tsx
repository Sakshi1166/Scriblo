import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Tldraw, Editor, getSnapshot, loadSnapshot, createShapeId } from '@tldraw/tldraw'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { RemoteCursors } from './RemoteCursors'
import type { PresenceUser, Json, RoomUpdate } from '../../lib/types'
import { Cloud, CloudCheck, Upload, AlertCircle, Radio } from 'lucide-react'

export interface DeadDropCanvasHandle {
  broadcastBurn: () => Promise<void>
}

interface DeadDropCanvasProps {
  roomId: string
  initialCanvasState?: Json
  currentUserId: string
  currentUserName: string
  currentUserColor: string
  onPresenceUsersChange: (users: PresenceUser[]) => void
  onBurnBroadcastReceived: () => void
}

export const DeadDropCanvas = forwardRef<DeadDropCanvasHandle, DeadDropCanvasProps>(({
  roomId,
  initialCanvasState,
  currentUserId,
  currentUserName,
  currentUserColor,
  onPresenceUsersChange,
  onBurnBroadcastReceived,
}, ref) => {
  const editorRef = useRef<Editor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const storeListenerCleanupRef = useRef<(() => void) | null>(null)

  // Stable callback refs so the channel useEffect doesn't re-run on parent re-renders
  const onPresenceChangeRef = useRef(onPresenceUsersChange)
  onPresenceChangeRef.current = onPresenceUsersChange
  const onBurnReceivedRef = useRef(onBurnBroadcastReceived)
  onBurnReceivedRef.current = onBurnBroadcastReceived

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [isUploading, setIsUploading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [cursorUsers, setCursorUsers] = useState<Record<string, PresenceUser>>({})

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isApplyingRemoteChange = useRef(false)
  const isChannelReady = useRef(false)      // Only true after SUBSCRIBED
  const lastLocalEditTime = useRef(0)
  const lastCursorSendTime = useRef(0)

  // Batched stroke broadcast: accumulate changes and flush every 50ms
  const pendingChangesRef = useRef<{
    added: Record<string, any>
    updated: Record<string, any>
    removed: Record<string, any>
  }>({ added: {}, updated: {}, removed: {} })
  const broadcastFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushBroadcast = useCallback(() => {
    if (!isChannelReady.current || !channelRef.current) return
    const pending = pendingChangesRef.current
    const hasData =
      Object.keys(pending.added).length > 0 ||
      Object.keys(pending.updated).length > 0 ||
      Object.keys(pending.removed).length > 0

    if (!hasData) return

    // Clone and reset the buffer before sending
    const toSend = {
      added: { ...pending.added },
      updated: { ...pending.updated },
      removed: { ...pending.removed },
    }
    pendingChangesRef.current = { added: {}, updated: {}, removed: {} }

    channelRef.current.send({
      type: 'broadcast',
      event: 'stroke_update',
      payload: {
        userId: currentUserId,
        changes: toSend,
      },
    }).catch(() => {})
  }, [currentUserId])

  const enqueueChanges = useCallback((changes: any) => {
    const pending = pendingChangesRef.current
    // Merge added
    if (changes.added) {
      Object.assign(pending.added, changes.added)
    }
    // Merge updated (keep latest [from, to] pair)
    if (changes.updated) {
      Object.assign(pending.updated, changes.updated)
    }
    // Merge removed
    if (changes.removed) {
      Object.assign(pending.removed, changes.removed)
    }

    // Debounce flush to ~50ms batches
    if (broadcastFlushTimerRef.current) {
      clearTimeout(broadcastFlushTimerRef.current)
    }
    broadcastFlushTimerRef.current = setTimeout(flushBroadcast, 50)
  }, [flushBroadcast])

  // Debounced database save function (3 seconds)
  const scheduleSave = useCallback(() => {
    lastLocalEditTime.current = Date.now()
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setSaveStatus('saving')
    saveTimeoutRef.current = setTimeout(async () => {
      if (!editorRef.current) return
      try {
        const snapshot = getSnapshot(editorRef.current.store)
        const updatePayload: RoomUpdate = {
          canvas_state: snapshot as unknown as Json,
        }
        const { error } = await supabase
          .from('rooms')
          .update(updatePayload)
          .eq('id', roomId)

        setSaveStatus(error ? 'error' : 'saved')
        if (error) console.error('[Vault] Persist failed:', error)
      } catch (err) {
        console.error('[Vault] Persist error:', err)
        setSaveStatus('error')
      }
    }, 3000)
  }, [roomId])

  // Expose broadcastBurn to parent via imperative handle
  useImperativeHandle(ref, () => ({
    broadcastBurn: async () => {
      if (channelRef.current && isChannelReady.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'room_burn',
          payload: { burnedBy: currentUserId, timestamp: new Date().toISOString() },
        })
      }
    },
  }))

  // ─── Realtime Channel Setup ────────────────────────────────────
  // Only depends on roomId and currentUser identity (stable values).
  // Callbacks use refs so they don't cause re-subscriptions.
  useEffect(() => {
    if (!roomId) return

    isChannelReady.current = false
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    })
    channelRef.current = channel

    // ── 1. Stroke broadcast from peers ──
    channel.on('broadcast', { event: 'stroke_update' }, ({ payload }) => {
      if (!payload || payload.userId === currentUserId || !editorRef.current) return
      const { changes } = payload
      if (!changes) return

      try {
        isApplyingRemoteChange.current = true
        const store = editorRef.current.store
        store.mergeRemoteChanges(() => {
          // Use applyDiff for proper merge semantics
          if (typeof (store as any).applyDiff === 'function') {
            (store as any).applyDiff(changes)
          } else {
            // Manual fallback
            if (changes.added) {
              store.put(Object.values(changes.added) as any)
            }
            if (changes.updated) {
              const records = Object.values(changes.updated).map((e: any) =>
                Array.isArray(e) ? e[1] : e
              )
              store.put(records as any)
            }
            if (changes.removed) {
              store.remove(Object.keys(changes.removed) as any[])
            }
          }
        })
      } catch (err) {
        console.warn('[Realtime] Stroke merge error:', err)
      } finally {
        isApplyingRemoteChange.current = false
      }
    })

    // ── 2. Cursor positions from peers ──
    channel.on('broadcast', { event: 'cursor_update' }, ({ payload }) => {
      if (!payload || payload.userId === currentUserId) return
      setCursorUsers((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          name: payload.name || 'Operative',
          color: payload.color || '#f5b942',
          joinedAt: prev[payload.userId]?.joinedAt || Date.now(),
          cursor: { x: payload.x, y: payload.y },
        },
      }))
    })

    // ── 3. Room burn from any peer ──
    channel.on('broadcast', { event: 'room_burn' }, () => {
      onBurnReceivedRef.current()
    })

    // ── 4. Presence sync ──
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: PresenceUser[] = []
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.userId) {
            users.push({
              userId: p.userId,
              name: p.name || 'Operative',
              color: p.color || '#f5b942',
              joinedAt: p.joinedAt || Date.now(),
            })
          }
        })
      })
      onPresenceChangeRef.current(users)
    })

    // ── 5. Presence leave — clean up stale cursors ──
    channel.on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
      if (Array.isArray(leftPresences)) {
        setCursorUsers((prev) => {
          const next = { ...prev }
          leftPresences.forEach((lp: any) => {
            if (lp.userId) delete next[lp.userId]
          })
          return next
        })
      }
    })

    // ── 6. Postgres changes fallback for late-joining peers ──
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        const elapsed = Date.now() - lastLocalEditTime.current
        if (elapsed > 4000 && editorRef.current && payload.new && 'canvas_state' in payload.new) {
          const remote = payload.new.canvas_state as any
          if (remote && typeof remote === 'object' && Object.keys(remote).length > 0) {
            try {
              isApplyingRemoteChange.current = true
              loadSnapshot(editorRef.current.store, remote)
            } catch { /* ignore */ }
            finally { isApplyingRemoteChange.current = false }
          }
        }
      }
    )

    // ── Subscribe LAST after all listeners are registered ──
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isChannelReady.current = true
        setIsConnected(true)
        try {
          await channel.track({
            userId: currentUserId,
            name: currentUserName,
            color: currentUserColor,
            joinedAt: Date.now(),
          })
        } catch {}
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        isChannelReady.current = false
        setIsConnected(false)
      }
    })

    return () => {
      isChannelReady.current = false
      channel.unsubscribe()
      channelRef.current = null
      setIsConnected(false)
    }
  }, [roomId, currentUserId, currentUserName, currentUserColor])

  // ─── Tldraw onMount ────────────────────────────────────────────
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor

    // Load initial snapshot if present
    if (initialCanvasState && typeof initialCanvasState === 'object' && Object.keys(initialCanvasState).length > 0) {
      try {
        loadSnapshot(editor.store, initialCanvasState as Parameters<typeof loadSnapshot>[1])
      } catch (err) {
        console.warn('[Tldraw] Initial snapshot load error:', err)
      }
    }

    // Clean up previous listener
    if (storeListenerCleanupRef.current) {
      storeListenerCleanupRef.current()
    }

    // Listen ONLY to local user-initiated document changes
    const cleanup = editor.store.listen(
      (entry) => {
        // Guard: skip if we're applying remote changes
        if (isApplyingRemoteChange.current) return

        // 1. Debounced save to database
        scheduleSave()

        // 2. Enqueue changes for batched broadcast (only if channel is ready)
        if (entry.changes && isChannelReady.current) {
          enqueueChanges(entry.changes)
        }
      },
      { source: 'user', scope: 'document' }
    )

    storeListenerCleanupRef.current = cleanup
  }, [initialCanvasState, scheduleSave, enqueueChanges])

  // Restore tldraw's viewport when a backgrounded tab becomes visible again.
  useEffect(() => {
    const refreshViewport = () => {
      if (document.visibilityState !== 'visible' || !editorRef.current || !containerRef.current) return
      requestAnimationFrame(() => {
        if (editorRef.current && containerRef.current) {
          editorRef.current.updateViewportScreenBounds(containerRef.current)
        }
      })
    }

    document.addEventListener('visibilitychange', refreshViewport)
    window.addEventListener('pageshow', refreshViewport)
    window.addEventListener('resize', refreshViewport)

    return () => {
      document.removeEventListener('visibilitychange', refreshViewport)
      window.removeEventListener('pageshow', refreshViewport)
      window.removeEventListener('resize', refreshViewport)
    }
  }, [])

  // ─── Pointer move → cursor broadcast (throttled ~25fps) ───────
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isChannelReady.current || !channelRef.current || !containerRef.current) return
    const now = Date.now()
    if (now - lastCursorSendTime.current < 40) return
    lastCursorSendTime.current = now

    const rect = containerRef.current.getBoundingClientRect()
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_update',
      payload: {
        userId: currentUserId,
        name: currentUserName,
        color: currentUserColor,
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
      },
    }).catch(() => {})
  }

  // ─── Image Drag & Drop ────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0 || !editorRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const pagePoint = editorRef.current.screenToPage({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })

    setIsUploading(true)

    for (const file of files) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${roomId}/${Date.now()}-${cleanName}`

        const { error: uploadError } = await supabase.storage
          .from('canvas-assets')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) { console.error('[Storage] Upload failed:', uploadError); continue }

        const { data: publicUrlData } = supabase.storage
          .from('canvas-assets')
          .getPublicUrl(storagePath)

        const img = new Image()
        img.src = URL.createObjectURL(file)
        await new Promise((res) => { img.onload = res })

        const maxW = 500
        const scale = Math.min(1, maxW / (img.width || 1))
        const w = Math.round((img.width || 400) * scale)
        const h = Math.round((img.height || 300) * scale)
        const assetId = `asset:${Math.random().toString(36).slice(2, 10)}` as any
        const shapeId = createShapeId()

        editorRef.current.createAssets([{
          id: assetId,
          typeName: 'asset',
          type: 'image',
          props: { name: file.name, src: publicUrlData.publicUrl, w, h, mimeType: file.type, isAnimated: false },
          meta: {},
        }])
        editorRef.current.createShape({
          id: shapeId,
          type: 'image',
          x: pagePoint.x,
          y: pagePoint.y,
          props: { assetId, w, h },
        })
        scheduleSave()
      } catch (err) {
        console.error('[Storage] Embed image error:', err)
      }
    }
    setIsUploading(false)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (broadcastFlushTimerRef.current) clearTimeout(broadcastFlushTimerRef.current)
      if (storeListenerCleanupRef.current) storeListenerCleanupRef.current()
    }
  }, [])

  const remoteCursorList = Object.values(cursorUsers)

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-screen h-screen overflow-hidden bg-black"
    >
      <RemoteCursors users={remoteCursorList} currentUserId={currentUserId} />

      <div className="absolute inset-0">
        <Tldraw autoFocus onMount={handleMount} />
      </div>

      {isUploading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 border border-amber-500/80 px-4 py-2 rounded-xl text-amber-300 font-mono text-xs flex items-center gap-2 shadow-lg backdrop-blur-md animate-pulse">
          <Upload className="w-4 h-4 animate-bounce" />
          <span>Uploading asset to ephemeral vault...</span>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-30 pointer-events-none flex items-center gap-2">
        <div className="bg-[#0c0e17]/85 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-mono">
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-yellow-400 animate-pulse' : 'text-amber-400'}`} />
          <span className={isConnected ? 'text-yellow-300' : 'text-amber-300'}>
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>

        <div className="bg-[#0c0e17]/85 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-mono">
          {saveStatus === 'saving' ? (
            <><Cloud className="w-3.5 h-3.5 text-amber-400 animate-spin" /><span className="text-amber-300">Syncing...</span></>
          ) : saveStatus === 'error' ? (
            <><AlertCircle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">Save Error</span></>
          ) : (
            <><CloudCheck className="w-3.5 h-3.5 text-amber-400" /><span className="text-slate-400">Synced</span></>
          )}
        </div>
      </div>
    </div>
  )
})
