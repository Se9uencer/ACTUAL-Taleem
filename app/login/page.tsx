"use client"

import "../auth-styles.css"
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { createClientComponentClient, directAuthSignIn } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"
import { dynamicAccent } from "@/lib/accent-utils"
import { isDebugMode } from "@/lib/debug-utils"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Debug states for intermittent issue tracking
  const [networkDebug, setNetworkDebug] = useState<string[]>([])
  const [supabaseDebug, setSupabaseDebug] = useState<string[]>([])
  const [browserDebug, setBrowserDebug] = useState<string[]>([])
  const [timingDebug, setTimingDebug] = useState<string[]>([])
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const addNetworkDebug = (info: string) => {
    console.log(`[NETWORK] ${info}`)
    setNetworkDebug((prev) => [...prev, info])
  }

  const addSupabaseDebug = (info: string) => {
    console.log(`[SUPABASE] ${info}`)
    setSupabaseDebug((prev) => [...prev, info])
  }

  const addBrowserDebug = (info: string) => {
    console.log(`[BROWSER] ${info}`)
    setBrowserDebug((prev) => [...prev, info])
  }

  const addTimingDebug = (info: string) => {
    console.log(`[TIMING] ${info}`)
    setTimingDebug((prev) => [...prev, info])
    
    // Also persist to localStorage to survive page refreshes
    try {
      const existing = JSON.parse(localStorage.getItem('taleem-debug-timing') || '[]')
      existing.push(`${new Date().toISOString()}: ${info}`)
      // Keep only last 20 entries
      const recent = existing.slice(-20)
      localStorage.setItem('taleem-debug-timing', JSON.stringify(recent))
    } catch (e) {
      console.warn('Could not persist debug info:', e)
    }
  }

  // Load persisted debug info on page load
  useEffect(() => {
    try {
      const persistedTiming = JSON.parse(localStorage.getItem('taleem-debug-timing') || '[]')
      if (persistedTiming.length > 0) {
        setTimingDebug(persistedTiming)
        addTimingDebug("📱 Loaded persisted debug info from previous session")
      }
    } catch (e) {
      console.warn('Could not load persisted debug info:', e)
    }
  }, [])

  // Run comprehensive diagnostics on page load
  const runDiagnostics = async () => {
    const diagnosticsStart = Date.now()
    addTimingDebug("🚀 Starting page diagnostics...")

    // 1. Browser Environment Check
    addBrowserDebug("🔍 Checking browser environment...")
    addBrowserDebug(`User Agent: ${navigator.userAgent.substring(0, 50)}...`)
    addBrowserDebug(`Online: ${navigator.onLine}`)
    addBrowserDebug(`Connection: ${(navigator as any).connection?.effectiveType || 'unknown'}`)
    addBrowserDebug(`localStorage available: ${typeof localStorage !== 'undefined'}`)
    addBrowserDebug(`Current time: ${new Date().toISOString()}`)
    
    // Check for existing sessions
    try {
      const existingSessions = localStorage.getItem('taleem-auth-token')
      addBrowserDebug(`Existing auth token: ${existingSessions ? 'Present' : 'None'}`)
    } catch (e) {
      addBrowserDebug("Cannot access localStorage")
    }

    // 2. Network Connectivity Tests
    addNetworkDebug("🌐 Testing network connectivity...")
    
    // Test 1: Basic connectivity
    try {
      const start = Date.now()
      await fetch('https://httpbin.org/get', { 
        method: 'GET', 
        signal: AbortSignal.timeout(3000) 
      })
      const end = Date.now()
      addNetworkDebug(`✅ Internet connectivity: ${end - start}ms`)
    } catch (error) {
      addNetworkDebug(`❌ Internet connectivity failed: ${error}`)
    }

    // Test 2: Supabase URL accessibility
    if (!supabaseConfig.url) {
      addNetworkDebug("❌ Supabase URL not configured")
    } else {
      try {
        const start = Date.now()
        const response = await fetch(supabaseConfig.url, { 
          method: 'GET', 
          signal: AbortSignal.timeout(5000) 
        })
        const end = Date.now()
        addNetworkDebug(`🏠 Supabase URL: ${response.status} (${end - start}ms)`)
      } catch (error) {
        addNetworkDebug(`❌ Supabase URL failed: ${error}`)
        
        // Test specific REST API endpoint
        try {
          const restStart = Date.now()
          const restResponse = await fetch(`${supabaseConfig.url}/rest/v1/`, {
            headers: { 'apikey': supabaseConfig.anonKey || 'missing-key' },
            signal: AbortSignal.timeout(3000)
          })
          const restEnd = Date.now()
          addNetworkDebug(`🔧 REST API: ${restResponse.status} (${restEnd - restStart}ms)`)
        } catch (restError) {
          addNetworkDebug(`❌ REST API failed: ${restError}`)
        }
      }
    }

    // Test 3: Supabase Auth Health Check
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      addNetworkDebug("❌ Supabase credentials not configured")
    } else {
      try {
        const start = Date.now()
        const response = await fetch(`${supabaseConfig.url}/auth/v1/settings`, {
          headers: { 'apikey': supabaseConfig.anonKey },
          signal: AbortSignal.timeout(5000)
        })
        const end = Date.now()
        addNetworkDebug(`🔑 Auth endpoint: ${response.status} (${end - start}ms)`)
        
        // Test token endpoint specifically  
        try {
          const tokenStart = Date.now()
          const tokenResponse = await fetch(`${supabaseConfig.url}/auth/v1/token`, {
            method: 'POST',
            headers: { 
              'apikey': supabaseConfig.anonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ grant_type: 'password' }),
            signal: AbortSignal.timeout(3000)
          })
          const tokenEnd = Date.now()
          addNetworkDebug(`🎫 Token endpoint: ${tokenResponse.status} (${tokenEnd - tokenStart}ms)`)
        } catch (tokenError) {
          addNetworkDebug(`❌ Token endpoint failed: ${tokenError}`)
        }
        
      } catch (error) {
        addNetworkDebug(`❌ Auth endpoint failed: ${error}`)
      }
    }

    // 3. Supabase Client Tests
    addSupabaseDebug("🗄️ Testing Supabase client...")
    try {
      const start = Date.now()
      const client = createClientComponentClient()
      const clientEnd = Date.now()
      addSupabaseDebug(`✅ Client created: ${clientEnd - start}ms`)

      // Test session retrieval
      const sessionStart = Date.now()
      const { data, error } = await client.auth.getSession()
      const sessionEnd = Date.now()
      
      if (error) {
        addSupabaseDebug(`❌ Session check failed: ${error.message} (${sessionEnd - sessionStart}ms)`)
      } else {
        addSupabaseDebug(`✅ Session check: ${data.session ? 'Has session' : 'No session'} (${sessionEnd - sessionStart}ms)`)
      }

    } catch (error) {
      addSupabaseDebug(`💥 Client test error: ${error}`)
    }

    const diagnosticsEnd = Date.now()
    addTimingDebug(`🏁 Diagnostics completed: ${diagnosticsEnd - diagnosticsStart}ms`)
  }

  useEffect(() => {
    // Check for message in URL
    const urlMessage = searchParams.get("message")
    if (urlMessage) {
      setMessage(urlMessage)
    }

    // Run diagnostics automatically
    runDiagnostics()
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    // CRITICAL: Prevent form submission refresh
    e.preventDefault()
    e.stopPropagation()
    
    addTimingDebug("🛡️ Form preventDefault called")

    // Return early if fields are empty
    if (!email || !password) {
      addTimingDebug("❌ Empty credentials provided")
      setError("Please enter both email and password.")
      return
    }

    // Add window error listener to catch crashes
    const errorHandler = (event: ErrorEvent) => {
      addTimingDebug(`💥 JavaScript Error: ${event.error}`)
      addTimingDebug(`💥 Error message: ${event.message}`)
      addTimingDebug(`💥 Error file: ${event.filename}:${event.lineno}`)
    }
    
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      addTimingDebug(`💥 Unhandled Promise Rejection: ${event.reason}`)
    }
    
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', unhandledRejectionHandler)

    // Don't clear previous debug info - append to it
    const attemptStart = Date.now()
    addTimingDebug(`🎯 Login attempt started at ${new Date().toISOString()}`)

    setLoading(true)
    setError(null)
    setMessage(null)
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      const timeoutTime = Date.now()
      addTimingDebug(`⏰ TIMEOUT reached after ${timeoutTime - attemptStart}ms`)
      setError("Login is taking too long. Please check your connection and try again.")
      setLoading(false)
    }, 10000) // 10 second timeout

    try {
      addTimingDebug("🔧 Validating configuration...")
      if (!supabaseConfig.isValid()) {
        throw new Error("Supabase configuration is invalid. Please check your environment variables.")
      }
      
      const configTime = Date.now()
      addTimingDebug(`✅ Config valid: ${configTime - attemptStart}ms`)
      
      addTimingDebug("🏗️ Creating Supabase client...")
      const clientStart = Date.now()
      const supabase = createClientComponentClient()
      const clientEnd = Date.now()
      addTimingDebug(`✅ Client created: ${clientEnd - clientStart}ms`)
      
      const normalizedEmail = email.toLowerCase().trim()
      addTimingDebug(`🔑 Attempting signin for: ${normalizedEmail}`)
      
      const signinStart = Date.now()
      
      // Try standard Supabase client first with shorter timeout
      let authResult: { data: any, error: any }
      let usedFallback = false
      
      try {
        addTimingDebug("🎯 Trying standard Supabase client...")
        
        // Create a race between signin and timeout
        const signinPromise = supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Standard auth timeout')), 5000)
        )
        
        authResult = await Promise.race([signinPromise, timeoutPromise]) as { data: any, error: any }
        addTimingDebug("✅ Standard auth succeeded")
        
      } catch (standardError) {
        addTimingDebug(`❌ Standard auth failed: ${standardError}`)
        addTimingDebug("🔄 Falling back to direct auth API...")
        
        // Fallback to direct auth
        usedFallback = true
        authResult = await directAuthSignIn(normalizedEmail, password)
        addTimingDebug("🎯 Direct auth attempt completed")
      }
      
      const signinEnd = Date.now()
      addTimingDebug(`🎉 Auth response: ${signinEnd - signinStart}ms (${usedFallback ? 'Direct API' : 'Standard Client'})`)

      clearTimeout(timeoutId)

      const { data, error: signInError } = authResult

      if (signInError) {
        addTimingDebug(`❌ Signin failed: ${signInError.message || signInError}`)
        
        // Handle Supabase-specific Auth errors
        if (signInError.name === "AuthApiError") {
          setError("Invalid email or password.")
        } else if (signInError.message && signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password.")
        } else {
          setError(`Authentication error: ${signInError.message || signInError}`)
        }
        addTimingDebug("🛑 LOGIN FAILED - staying on login page")
        return
      }

      if (!data || !data.user) {
        addTimingDebug("❌ No user data in response")
        addTimingDebug(`📊 Response data: ${JSON.stringify(data)}`)
        setError("Login failed. Please try again.")
        addTimingDebug("🛑 LOGIN FAILED - no user data")
        return
      }

      const totalTime = Date.now() - attemptStart
      addTimingDebug(`🚀 SUCCESS! Total time: ${totalTime}ms`)
      addTimingDebug(`👤 User: ${data.user.id}`)
      addTimingDebug(`🔧 Method: ${usedFallback ? 'Direct API Fallback' : 'Standard Client'}`)
      addTimingDebug("🔄 About to redirect to dashboard...")

      // Add delay before redirect to see if that's causing the issue
      setTimeout(() => {
        addTimingDebug("🚀 Executing redirect now...")
        router.push("/dashboard")
      }, 100)
      
    } catch (error) {
      clearTimeout(timeoutId)
      const errorTime = Date.now()
      addTimingDebug(`💥 Exception at ${errorTime - attemptStart}ms: ${error}`)
      addTimingDebug(`💥 Error stack: ${error instanceof Error ? error.stack : 'No stack'}`)
      
      // Handle network errors
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          setError("Network error: Cannot reach authentication server. Please check your internet connection.")
        } else if (error.message.includes('timeout')) {
          setError("Request timeout: The server took too long to respond. Please try again.")
        } else {
          setError(`Authentication error: ${error.message}`)
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      addTimingDebug("🛑 LOGIN FAILED - exception caught")
    } finally {
      setLoading(false)
      const finalTime = Date.now()
      addTimingDebug(`🏁 Login process ended: ${finalTime - attemptStart}ms`)
      
      // Cleanup error listeners
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground auth-page"
    >
      {/* Debug Box 1: Network Connectivity */}
      {isDebugMode() && (
        <div className="fixed top-4 left-4 bg-green-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">🌐 Network Debug:</h4>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {networkDebug.map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Box 2: Supabase Health */}
      {isDebugMode() && (
        <div className="fixed top-4 right-4 bg-blue-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">🗄️ Supabase Debug:</h4>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {supabaseDebug.map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Box 3: Browser Environment */}
      {isDebugMode() && (
        <div className="fixed bottom-4 left-4 bg-purple-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">🖥️ Browser Debug:</h4>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {browserDebug.map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Box 4: Timing Analysis */}
      {isDebugMode() && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 text-white p-3 rounded-lg max-w-md z-50">
          <h4 className="font-bold text-xs mb-2">⏱️ Timing Debug:</h4>
          <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
            {timingDebug.map((info, index) => (
              <div key={index} className="font-mono text-xs leading-tight">{info}</div>
            ))}
          </div>
          <div className="text-xs mt-2 opacity-70 border-t border-red-700 pt-1">
            Loading: {loading.toString()} | Total entries: {timingDebug.length}
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <TaleemLogo className="h-12 w-auto mx-auto text-primary" />
        <h2 className="mt-6 text-center text-3xl font-bold">Sign in to your account</h2>
        <p className="mt-2 text-center text-sm">
          Or{" "}
          <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-6">
            {message && (
              <div className="mb-6 p-3 bg-success/10 text-success border border-success/20 rounded-md flex items-start">
                <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{message}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmed.khan@example.com"
                  className="border-input focus:border-ring focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-input focus:border-ring focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/forgot-password" className={`font-medium ${dynamicAccent.link.primary}`}>
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 focus:ring-ring"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}