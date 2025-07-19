"use client"

import "../auth-styles.css"
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { createClientComponentClient } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()

  

  useEffect(() => {
    // Check for message in URL
    const urlMessage = searchParams.get("message")
    if (urlMessage) {
      setMessage(urlMessage)
    }
  }, [searchParams])

  const addDebugInfo = (info: string) => {
    console.log(info)
    setDebugInfo((prev) => [...prev, info])
  }

  const createProfileIfNeeded = async (supabase: any, user: any) => {
    addDebugInfo(`Checking if profile exists for user ${user.id}`)

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      addDebugInfo(`Error checking profile: ${profileError.message}`)
      return false
    }

    if (!profile) {
      addDebugInfo("No profile found, creating one")

      // Extract user metadata
      const metadata = user.user_metadata || {}
      const role = metadata.role || "student"

      // Create profile
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email.toLowerCase(),
        first_name: metadata.first_name || "",
        last_name: metadata.last_name || "",
        role: role,
        created_at: new Date().toISOString(),
        school_id: null, // Explicitly set to null
      })

      if (insertError) {
        addDebugInfo(`Error creating profile: ${insertError.message}`)
        return false
      }

      addDebugInfo(`Profile created with role: ${role}`)
      return true
    }

    addDebugInfo(`Profile exists with role: ${profile.role}`)
    return true
  }



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Return early if fields are empty
    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClientComponentClient()
    const normalizedEmail = email.toLowerCase().trim()

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        // 3. Handle Supabase-specific Auth errors
        if (signInError.name === "AuthApiError") {
          setError("Invalid email or password.")
        } else {
          setError("An unexpected error occurred. Please try again.")
        }

        // 4. Log detailed error in development
        if (process.env.NODE_ENV === "development") {
          // Use console.warn to avoid triggering aggressive error overlays
          console.warn("Supabase Login Handled Error:", signInError)
        }
        return // Stop execution if there was an error
      }

      if (!data.user) {
        setError("Login failed. Please try again.")
        return
      }

      // On success, redirect to the dashboard
      router.push("/dashboard")
    } catch (error) {
      // 5. Handle unexpected errors (e.g., network issues)
      setError("A network error occurred. Please check your connection and try again.")
      if (process.env.NODE_ENV === "development") {
        console.warn("Unexpected Login Handled Error:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground auth-page"
    >
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
                  <Link href="/forgot-password" className="font-medium text-purple-600 hover:text-purple-500">
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



            {debugInfo.length > 0 && (
              <div className="mt-6 p-3 bg-muted rounded-md">
                <details>
                  <summary className="text-sm font-medium cursor-pointer">Debug Information</summary>
                  <div className="mt-2 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {debugInfo.map((info, index) => (
                      <div key={index}>{info}</div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}