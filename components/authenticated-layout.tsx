"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase/client"
import { AcademicHeader } from "@/components/academic-header"
import { useSettings } from "@/contexts/settings-context"

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { isLoading: settingsLoading, resolvedTheme } = useSettings()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientComponentClient()

      try {
        // Check if user is authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !sessionData.session) {
          console.log("No valid session found, redirecting to login")
          router.push("/login")
          return
        }

        console.log("Valid session found for user:", sessionData.session.user.id)

        // Get user profile
        console.log("Attempting to fetch profile for user ID:", sessionData.session.user.id)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()

        if (profileError) {
          // Log the initial error for debugging. Using JSON.stringify to see the full object.
          console.log(`Initial profile fetch failed:`, JSON.stringify(profileError, null, 2))

          // If profile doesn't exist (PGRST116) or we get a strange error without a code (like {}),
          // we assume it's a race condition on first login and proceed to create/verify.
          if (profileError.code === 'PGRST116' || !profileError.code) {
            console.log("Profile not found or ambiguous error. Attempting to create/verify profile...")

            try {
              const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: sessionData.session.user.id,
                  email: sessionData.session.user.email,
                  first_name: sessionData.session.user.user_metadata?.first_name || "",
                  last_name: sessionData.session.user.user_metadata?.last_name || "",
                  role: sessionData.session.user.user_metadata?.role || "student",
                })
                .select()
                .single()

              if (createError) {
                // This block will likely run if the DB trigger created the profile just before this insert was attempted.
                console.log("Could not create profile (likely already exists). Error:", createError.message)
                
                // Wait a moment for DB replication and try to fetch the profile again.
                console.log("Retrying profile fetch...")
                await new Promise(resolve => setTimeout(resolve, 500))
                
                const { data: retryProfile, error: retryError } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", sessionData.session.user.id)
                  .single()
                
                if (retryError) {
                  // This is a more serious issue. The profile is missing even after creation was attempted and retried.
                  console.warn("Profile still not found after retry. Using auth data as fallback.", retryError)
                  setUser({
                    id: sessionData.session.user.id,
                    email: sessionData.session.user.email,
                    first_name: sessionData.session.user.user_metadata?.first_name || "",
                    last_name: sessionData.session.user.user_metadata?.last_name || "",
                    role: sessionData.session.user.user_metadata?.role || "student",
                  })
                } else {
                  console.log("Successfully fetched profile on retry:", retryProfile)
                  setUser(retryProfile)
                }
              } else {
                console.log("Profile created successfully by client:", newProfile)
                setUser(newProfile)
              }
            } catch (insertError: any) {
              console.warn("Unexpected error during profile creation attempt. Using fallback.", insertError.message)
              setUser({
                id: sessionData.session.user.id,
                email: sessionData.session.user.email,
                first_name: sessionData.session.user.user_metadata?.first_name || "",
                last_name: sessionData.session.user.user_metadata?.last_name || "",
                role: sessionData.session.user.user_metadata?.role || "student",
              })
            }
          } else {
            // This is for other, unexpected Postgrest errors (e.g., RLS issue, server down)
            console.warn("An unexpected Supabase error occurred while fetching the profile:", profileError)
            setUser({
              id: sessionData.session.user.id,
              email: sessionData.session.user.email,
              role: sessionData.session.user.user_metadata?.role || "student",
            })
          }
        } else if (!profileData) {
          console.warn("No profile data was returned, but no error was thrown. This is unexpected.")
          // Fallback to basic user info.
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            role: sessionData.session.user.user_metadata?.role || "student",
          })
        } else {
          console.log("Profile loaded successfully:", profileData)
          setUser(profileData)
        }
      } catch (error) {
        console.warn("Unexpected error in checkAuth:", error)
        // Try to get basic session info even if profile loading fails
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            first_name: sessionData.session.user.user_metadata?.first_name || "",
            last_name: sessionData.session.user.user_metadata?.last_name || "",
            role: sessionData.session.user.user_metadata?.role || "student",
          })
        } else {
          router.push("/login")
          return
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading || settingsLoading) {
    // Get the current theme from localStorage to show correct loading state
    const currentTheme = typeof window !== "undefined" ? localStorage.getItem("taleem-theme") || "system" : "system"

    const isDarkMode =
      currentTheme === "dark" ||
      (currentTheme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AcademicHeader user={user} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
