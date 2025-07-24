"use client"

import "../auth-styles.css"
import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  
  const { signIn, loading, error, user, clearError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  // Check for URL message on mount
  useEffect(() => {
    const urlMessage = searchParams.get("message")
    if (urlMessage) {
      setMessage(urlMessage)
    }
  }, [searchParams])

  // Clear error when component mounts or user types
  useEffect(() => {
    clearError()
  }, [clearError])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return
    }

    const result = await signIn(email.toLowerCase().trim(), password)
    
    if (!result.error) {
      // Success - redirect will happen via useEffect when user state updates
      router.push("/dashboard")
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
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <CardContent>
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email address
                </label>
                <div className="mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !email || !password}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-destructive">Error</h3>
                      <div className="mt-2 text-sm text-destructive/80">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{message}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}