"use client"

import { useAuth } from '@/contexts/auth-context'
import { AcademicHeader } from './academic-header'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export default function AuthenticatedLayout({ children, requireAuth = true }: AuthenticatedLayoutProps) {
  const { user, profile, loading, initialized } = useAuth()
  const router = useRouter()

  // True after 3 s with a user but no profile — switches from spinner to error
  const [profileTimedOut, setProfileTimedOut] = useState(false)

  useEffect(() => {
    if (user && !profile) {
      const t = setTimeout(() => setProfileTimedOut(true), 3000)
      return () => clearTimeout(t)
    }
    setProfileTimedOut(false)
  }, [user, profile])

  // Redirect unauthenticated users to login
  if (requireAuth && initialized && !user) {
    router.push('/login')
    return null
  }

  // Still initialising auth (first load)
  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    )
  }

  // Profile background fetch still in flight
  if (requireAuth && user && !profile && !profileTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Profile never arrived after 3 s
  if (requireAuth && user && !profile && profileTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load your profile. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Refresh Page
          </button>
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
