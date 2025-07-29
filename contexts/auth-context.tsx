"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  role: 'teacher' | 'student' | 'parent'
  first_name?: string
  last_name?: string
  school_id?: string
  grade?: string
  student_id?: string
  parent_email?: string
  parent_phone?: string
}

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
  const supabase = createClient()

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
        console.error('Profile loading error:', profileError)
        return null
      }

      if (!profileData || !profileData.id || !profileData.email || !profileData.role) {
        console.error('Invalid profile data received:', profileData)
        return null
      }

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role,
        first_name: profileData.first_name || undefined,
        last_name: profileData.last_name || undefined,
        school_id: profileData.school_id || undefined,
        grade: profileData.grade || undefined,
        student_id: profileData.student_id || undefined,
        parent_email: profileData.parent_email || undefined,
        parent_phone: profileData.parent_phone || undefined,
      } as Profile
    } catch (error) {
      console.error('Failed to load profile:', error)
      return null
    }
  }, [supabase])

  const updateAuthState = useCallback(async (session: Session | null) => {
    console.log('[AuthContext] Updating auth state with session:', session ? 'Present' : 'Null')
    
    if (!session?.user) {
      console.log('[AuthContext] No session or user, clearing auth state')
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

    console.log('[AuthContext] Loading profile for user:', session.user.id.substring(0, 8) + '...')
    
    try {
      const profile = await loadProfile(session.user.id)
      
      if (profile) {
        console.log('[AuthContext] Profile loaded successfully:', profile.role)
        setAuthState({
          user: session.user,
          profile,
          session,
          loading: false,
          error: null,
          initialized: true
        })
      } else {
          // Attempt to create a default profile when none is found
  try {
    const supabaseClient = createClient()
    const { error: insertError } = await supabaseClient.from('profiles').insert({
      id: session.user.id,
      email: session.user.email?.toLowerCase().trim() ?? '',
      role: 'student',
    })
    if (!insertError) {
      const newProfile = await loadProfile(session.user.id)
      if (newProfile) {
        setAuthState({
          user: session.user,
          profile: newProfile,
          session,
          loading: false,
          error: null,
          initialized: true,
        })
        return
      } else {
        console.warn('[AuthContext] Profile could not be loaded after creation')
      }
    } else {
      console.error('[AuthContext] Profile creation error:', insertError)
    }
  } catch (createProfileError) {
    console.error('[AuthContext] Failed to create missing profile:', createProfileError)
  }
  // Fall back to showing error if profile still cannot be loaded
        
        console.warn('[AuthContext] Failed to load profile, but user session is valid')
        setAuthSt  ae({
          user: session.user,
          profile: null,
          session
          loading: false,
          error: 'Failed to load user profile',
          initialized: true
        })
      }
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error)
      setAuthState({
        user: session.user,
        profile: null,
        session,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load profile',
        initialized: true
      })
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
