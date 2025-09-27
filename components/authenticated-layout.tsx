"use client"

import { useAuth } from '@/contexts/auth-context'
import { AcademicHeader } from './academic-header'
import { useEffect, useState } from 'react'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export default function AuthenticatedLayout({ children, requireAuth = true }: AuthenticatedLayoutProps) {
  const { user, profile, loading, error, initialized } = useAuth()
  const [showTimeout, setShowTimeout] = useState(false)

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (loading && !initialized) {
      const timeout = setTimeout(() => {
        console.log('[AuthenticatedLayout] Loading timeout reached')
        setShowTimeout(true)
      }, 8000) // 8 second timeout

      return () => clearTimeout(timeout)
    } else {
      setShowTimeout(false)
    }
  }, [loading, initialized])

  // Debug logging
  useEffect(() => {
    console.log('[AuthenticatedLayout] Auth state:', { loading, initialized, hasUser: !!user, hasProfile: !!profile, error })
  }, [loading, initialized, user, profile, error])

  // Show loading while auth is initializing (but only if not initialized yet)
  if (loading && !initialized && !showTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    )
  }

  // Show timeout error if loading takes too long
  if (showTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-red-600 mb-4">Loading is taking longer than expected. This might be a network issue.</p>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setShowTimeout(false)
                window.location.reload()
              }}
              className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show error if there's an auth error
  if (error && requireAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If we have a user but no profile, show a different error
  if (requireAuth && user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load your profile. Please try again.</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {requireAuth && profile && <AcademicHeader user={profile} />}
      {children}
    </>
  )
}