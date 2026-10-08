import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  clientId: string
  clientName: string
  anonymousId: string
  anonymousName: string
}

const AGENT_NAMES = [
  'Cipher', 'Spectre', 'Ghost', 'Valkyrie', 'Vortex',
  'Echo', 'Apex', 'Nova', 'Rogue', 'Titan', 'Zephyr'
]

function getOrCreateSessionAgent() {
  try {
    const existingId = sessionStorage.getItem('dead_drop_client_id')
    const existingName = sessionStorage.getItem('dead_drop_client_name')
    if (existingId && existingName) {
      return { id: existingId, name: existingName }
    }
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const randomName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)] + '-' + randomSuffix
    const newId = 'agent-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
    sessionStorage.setItem('dead_drop_client_id', newId)
    sessionStorage.setItem('dead_drop_client_name', randomName)
    return { id: newId, name: randomName }
  } catch {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return {
      id: 'agent-' + Math.random().toString(36).substring(2, 9),
      name: AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)] + '-' + randomSuffix,
    }
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  clientId: 'agent-fallback',
  clientName: 'Operative',
  anonymousId: 'agent-fallback',
  anonymousName: 'Operative',
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentInfo] = useState(getOrCreateSessionAgent)

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        
        if (existingSession) {
          if (mounted) {
            setSession(existingSession)
            setUser(existingSession.user)
            setLoading(false)
          }
          return
        }

        // Attempt anonymous sign in
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
        if (anonError) {
          console.warn('Anonymous sign-in notice:', anonError.message)
        } else if (anonData.session && mounted) {
          setSession(anonData.session)
          setUser(anonData.session.user)
        }
      } catch (err) {
        console.warn('Auth initialization notice:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        clientId: agentInfo.id,
        clientName: agentInfo.name,
        anonymousId: agentInfo.id,
        anonymousName: agentInfo.name,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
