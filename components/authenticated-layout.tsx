"use client"

import { createClientComponentClient, directGetUser, directGetSession } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isDebugMode } from '@/lib/debug-utils'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Debug state
  const [debugData, setDebugData] = useState<string[]>([])
  const [authTiming, setAuthTiming] = useState<string[]>([])

  const addDebug = (message: string) => {
    const timestamp = new Date().toISOString()
    const debugMsg = `${timestamp}: ${message}`
    setDebugData(prev => [...prev, debugMsg])
    console.log(`[AuthLayout] ${debugMsg}`)
  }

  const addTiming = (message: string) => {
    const timestamp = new Date().toISOString()
    const timingMsg = `${timestamp}: ${message}`
    setAuthTiming(prev => [...prev, timingMsg])
    console.log(`[AuthTiming] ${timingMsg}`)
  }

  useEffect(() => {
    addDebug('🚀 AuthenticatedLayout mounted')
    addTiming('⏱️ Starting authentication check')
    
    const checkAuth = async () => {
      try {
        addDebug('🔍 Creating Supabase client...')
        const supabase = createClientComponentClient()
        
        addDebug('👤 Getting current user session...')
        
        // Add timeout to getUser call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getUser timeout')), 5000)
        })
        
        const getUserPromise = supabase.auth.getUser()
        
        let userResult: any
        try {
          userResult = await Promise.race([getUserPromise, timeoutPromise])
          addDebug('✅ Standard getUser succeeded')
        } catch (timeoutError: any) {
          addDebug(`⏰ Standard getUser timed out: ${timeoutError?.message || 'timeout'}`)
          addDebug('🔄 Trying direct session check...')
          
          // Fallback: try to get session directly
          try {
            addDebug('⏰ Adding timeout to session check...')
            const sessionTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('getSession timeout')), 3000)
            })
            
            const getSessionPromise = supabase.auth.getSession()
            const sessionResult: any = await Promise.race([getSessionPromise, sessionTimeoutPromise])
            
            const { data: { session }, error: sessionError } = sessionResult
            if (sessionError) throw sessionError
            
            if (session?.user) {
              addDebug('✅ Direct session check found user')
              userResult = { data: { user: session.user }, error: null }
            } else {
              addDebug('❌ Direct session check: no user found')
              throw new Error('No session found')
            }
          } catch (sessionErr: any) {
            addDebug(`❌ Direct session check failed: ${sessionErr?.message || 'unknown error'}`)
            addDebug('🔄 Trying direct localStorage session...')
            
            // Final fallback: direct localStorage session check
            try {
              const directResult = await directGetUser()
              if (directResult.error || !directResult.data.user) {
                addDebug('❌ Direct localStorage session: no user found')
                throw new Error('No stored session found')
              }
              
              addDebug('✅ Direct localStorage session found user')
              userResult = directResult
            } catch (directErr: any) {
              addDebug(`❌ Direct localStorage session failed: ${directErr?.message || 'unknown error'}`)
              addDebug('🚨 All auth methods failed - redirecting to login')
              addTiming('⏱️ All auth methods failed - redirecting to login')
              router.push('/login')
              return
            }
          }
        }
        
        const { data: { user }, error: userError } = userResult
        
        if (userError) {
          addDebug(`❌ User session error: ${userError.message}`)
          setError(userError.message)
          addTiming('⏱️ Redirecting to login due to session error')
          router.push('/login')
          return
        }

        if (!user) {
          addDebug('❌ No user found in session')
          addTiming('⏱️ Redirecting to login - no user')
          router.push('/login')
          return
        }

        addDebug(`✅ User found: ${user.email} (ID: ${user.id.substring(0, 8)}...)`)
        setUser(user)

        addDebug('📋 Loading user profile...')
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          addDebug(`⚠️ Profile error: ${profileError.message}`)
          setError(profileError.message)
        } else {
          addDebug(`✅ Profile loaded: ${profileData?.role || 'unknown role'}`)
          setProfile(profileData)
        }

        addTiming('⏱️ Authentication check completed successfully')
        setLoading(false)

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        addDebug(`💥 Auth check failed: ${errorMsg}`)
        setError(errorMsg)
        addTiming('⏱️ Redirecting due to auth check failure')
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your account...</p>
        </div>

        {/* Debug Box 1: Auth Flow */}
        {isDebugMode() && (
          <div className="fixed top-4 left-4 bg-blue-900/90 text-white p-3 rounded-lg max-w-md z-50">
            <h4 className="font-bold text-xs mb-2">🔐 Auth Flow Debug:</h4>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {debugData.map((info, index) => (
                <div key={index} className="font-mono text-xs leading-tight">{info}</div>
              ))}
            </div>
            <div className="text-xs mt-2 opacity-70 border-t border-blue-700 pt-1">
              Loading: {loading.toString()} | User: {user ? 'Found' : 'None'}
            </div>
          </div>
        )}

        {/* Debug Box 2: Auth Timing */}
        {isDebugMode() && (
          <div className="fixed top-4 right-4 bg-purple-900/90 text-white p-3 rounded-lg max-w-md z-50">
            <h4 className="font-bold text-xs mb-2">⏱️ Auth Timing:</h4>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {authTiming.map((info, index) => (
                <div key={index} className="font-mono text-xs leading-tight">{info}</div>
              ))}
            </div>
            <div className="text-xs mt-2 opacity-70 border-t border-purple-700 pt-1">
              Steps: {authTiming.length} | Error: {error || 'None'}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication error: {error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return children
}
