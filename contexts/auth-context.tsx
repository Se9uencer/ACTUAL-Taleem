"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  initialized: boolean
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
    initialized: false
  })

  const router = useRouter()
  // useMemo ensures the same client instance is used across all renders.
  // Without this, every re-render (e.g. setLoading) creates a new supabase
  // object which changes supabase.auth, re-triggers the useEffect, and spawns
  // duplicate auth subscriptions / parallel loadProfile calls that hang.
  const supabase = useMemo(() => createClient(), [])

  const setLoading = (loading: boolean) => {
    setAuthState(prev => ({ ...prev, loading }))
  }

  const setError = (error: string | null) => {
    setAuthState(prev => ({ ...prev, error }))
  }

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Profile loading error — code:', profileError.code, 'message:', profileError.message, 'details:', profileError.details)
        return null
      }

      if (!profileData) {
        console.error('Profile query returned no data for userId:', userId)
        return null
      }

      return profileData
    } catch (error) {
      console.error('Failed to load profile:', error)
      return null
    }
  }, [supabase])

  const updateAuthState = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
        initialized: true
      })
      return
    }

    // Build an immediate profile from session metadata so the UI never blocks.
    // Supabase stores the signup form values in user_metadata, so this is always
    // available without a database round-trip.
    const meta = session.user.user_metadata ?? {}
    const immediateProfile: Profile = {
      id: session.user.id,
      email: session.user.email ?? null,
      role: meta.role ?? null,
      first_name: meta.first_name ?? null,
      last_name: meta.last_name ?? null,
      grade: meta.grade ?? null,
      parent_email: meta.parent_email ?? null,
      parent_phone: meta.parent_phone ?? null,
      school_id: null,
      student_id: null,
      theme_accent_color: null,
      created_at: null,
    }

    setAuthState({
      user: session.user,
      profile: immediateProfile,
      session,
      loading: false,
      error: null,
      initialized: true
    })

    // Load the full DB profile in the background to pick up any server-side
    // updates (e.g. student_id, school_id, theme colour). Non-critical — the
    // app is already usable with the metadata profile above.
    try {
      const dbProfile = await loadProfile(session.user.id)
      if (dbProfile) {
        setAuthState(prev => ({ ...prev, profile: dbProfile }))
      }
    } catch (error) {
      console.error('[AuthContext] Background DB profile load failed:', error)
    }
  }, [loadProfile])

  const refreshAuth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(sessionError.message)
      }

      await updateAuthState(session)
    } catch (error) {
      console.error('Auth refresh failed:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        initialized: true,
        user: null,
        profile: null,
        session: null
      }))
    }
  }, [supabase.auth, updateAuthState])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (signInError) {
        const errorMessage = signInError.message.includes("Invalid login credentials") 
          ? "Invalid email or password."
          : signInError.message
        setError(errorMessage)
        setLoading(false)
        return { error: errorMessage }
      }

      if (!data?.user || !data?.session) {
        const errorMessage = "Login failed. Please try again."
        setError(errorMessage)
        setLoading(false)
        return { error: errorMessage }
      }

      await updateAuthState(data.session)
      return {}
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      setLoading(false)
      return { error: errorMessage }
    }
  }, [supabase.auth, updateAuthState])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
        initialized: true
      })
      
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if sign out fails, clear local state
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
        initialized: true
      })
      router.push('/login')
    }
  }, [supabase.auth, router])

  // Initialize auth state and set up auth listener
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...')
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (sessionError) {
          console.error('[AuthContext] Initial session error:', sessionError)
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: sessionError.message,
            initialized: true
          }))
          return
        }

        console.log('[AuthContext] Session check result:', session ? 'Found session' : 'No session')
        await updateAuthState(session)
      } catch (error) {
        if (!mounted) return
        console.error('[AuthContext] Auth initialization failed:', error)
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
          initialized: true
        }))
      }
    }

    initializeAuth()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('[AuthContext] Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
          initialized: true
        })
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await updateAuthState(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth, updateAuthState])

  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    refreshAuth,
    clearError
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
} 
