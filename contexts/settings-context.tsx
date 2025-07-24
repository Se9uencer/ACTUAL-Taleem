"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { 
  type AccentColor, 
  getUserThemeAccentColorDirect, 
  AVAILABLE_ACCENT_COLORS,
  isValidAccentColor 
} from "@/lib/theme-utils"

interface SettingsContextType {
  colorAccent: AccentColor
  setColorAccent: (color: AccentColor) => void
  isLoading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [colorAccent, setColorAccentState] = useState<AccentColor>("purple")
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load accent color based on authentication status
  useEffect(() => {
    setMounted(true)

    const supabase = createClientComponentClient()

    // Always start with purple, then load user's saved color if authenticated
    const loadAccentColor = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()

        if (session?.session?.user) {
          // User is logged in - load their saved accent color from Supabase
          const userAccentColor = await getUserThemeAccentColorDirect(supabase)
          
          if (userAccentColor && isValidAccentColor(userAccentColor)) {
            setColorAccentState(userAccentColor)
            localStorage.setItem("taleem-color", userAccentColor)
          } else {
            // User is logged in but has no saved color - use purple default
            setColorAccentState("purple")
            localStorage.setItem("taleem-color", "purple")
          }
        } else {
          // User is not logged in - always use purple
          setColorAccentState("purple")
          localStorage.setItem("taleem-color", "purple")
        }
      } catch (error) {
        console.error("Error loading accent color:", error)
        // On error, fallback to purple
        setColorAccentState("purple")
        localStorage.setItem("taleem-color", "purple")
      } finally {
        setIsLoading(false)
      }
    }

    // Load initial accent color
    loadAccentColor()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        // User logged out or session ended - reset to purple immediately
        setColorAccentState("purple")
        localStorage.setItem("taleem-color", "purple")
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User logged in - load their saved accent color
        try {
          const userAccentColor = await getUserThemeAccentColorDirect(supabase)
          
          if (userAccentColor && isValidAccentColor(userAccentColor)) {
            setColorAccentState(userAccentColor)
            localStorage.setItem("taleem-color", userAccentColor)
          } else {
            // User logged in but has no saved color - use purple default
            setColorAccentState("purple")
            localStorage.setItem("taleem-color", "purple")
          }
        } catch (error) {
          console.error("Error loading user accent color after login:", error)
          setColorAccentState("purple")
          localStorage.setItem("taleem-color", "purple")
        }
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Update color accent styles and data attributes
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    // Update CSS variable for primary color
    root.style.setProperty("--primary", `var(--color-${colorAccent})`)

    // Store color accent in localStorage
    localStorage.setItem("taleem-color", colorAccent)

    // Set data attribute for easier CSS targeting
    root.setAttribute("data-accent", colorAccent)

    setIsLoading(false)
  }, [colorAccent, mounted])

  // Set color accent function
  const setColorAccent = (newColor: AccentColor) => {
    setColorAccentState(newColor)
  }

  return (
    <SettingsContext.Provider
      value={{
        colorAccent,
        setColorAccent,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

