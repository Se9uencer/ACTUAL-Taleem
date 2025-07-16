"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { createClientComponentClient } from "@/lib/supabase/client"

type Theme = "light" | "dark" | "system"
type ColorAccent = "purple" | "blue" | "teal" | "green"

interface SettingsContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorAccent: ColorAccent
  setColorAccent: (color: ColorAccent) => void
  saveSettingsToSupabase: () => Promise<void>
  isLoading: boolean
  resolvedTheme: "light" | "dark" // The actual theme after resolving system preference
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme: nextResolvedTheme } = useTheme()
  const [colorAccent, setColorAccentState] = useState<ColorAccent>("purple")
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage and Supabase on mount
  useEffect(() => {
    setMounted(true)

    // Load color accent from localStorage immediately
    const storedColor = localStorage.getItem("taleem-color") as ColorAccent | null
    if (storedColor) {
      setColorAccentState(storedColor)
    }

    // Load settings from user's profile in Supabase if they're logged in
    const loadSettingsFromSupabase = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data: session } = await supabase.auth.getSession()

        if (session?.session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("theme, color_accent")
            .eq("id", session.session.user.id)
            .single()

          if (data) {
            // Update theme via next-themes
            if (data.theme && typeof data.theme === 'string') {
              setNextTheme(data.theme)
              localStorage.setItem("taleem-theme", data.theme)
            }

            // Update color accent
            if (data.color_accent && typeof data.color_accent === 'string') {
              setColorAccentState(data.color_accent as ColorAccent)
              localStorage.setItem("taleem-color", data.color_accent)
            }
          }
        }
      } catch (error) {
        console.error("Error loading settings from Supabase:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettingsFromSupabase()
  }, [setNextTheme])

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

  // Update data-theme attribute when resolved theme changes
  useEffect(() => {
    if (!mounted || !nextResolvedTheme) return

    const root = window.document.documentElement
    root.setAttribute("data-theme", nextResolvedTheme)
  }, [nextResolvedTheme, mounted])

  // Set theme function that uses next-themes
  const setTheme = (newTheme: Theme) => {
    setNextTheme(newTheme)
    localStorage.setItem("taleem-theme", newTheme)
  }

  // Set color accent function
  const setColorAccent = (newColor: ColorAccent) => {
    setColorAccentState(newColor)
  }

  // Save theme and color accent preferences to the user's profile in Supabase
  const saveSettingsToSupabase = async () => {
    try {
      const supabase = createClientComponentClient()
      const { data: session } = await supabase.auth.getSession()

      if (session?.session?.user) {
        await supabase
          .from("profiles")
          .update({
            theme: nextTheme,
            color_accent: colorAccent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.session.user.id)
      }

      return Promise.resolve()
    } catch (error) {
      console.error("Error saving settings to Supabase:", error)
      return Promise.reject(error)
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        theme: (nextTheme as Theme) || "system",
        setTheme,
        colorAccent,
        setColorAccent,
        saveSettingsToSupabase,
        isLoading,
        resolvedTheme: (nextResolvedTheme as "light" | "dark") || "light",
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
