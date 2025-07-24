"use client"

import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { 
  AVAILABLE_ACCENT_COLORS, 
  type AccentColor, 
  updateUserThemeAccentColorDirect,
  getUserThemeAccentColorDirect 
} from "@/lib/theme-utils"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface AccentColorSelectorProps {
  className?: string
  showTitle?: boolean
  onColorChange?: (color: AccentColor) => void
}

const COLOR_LABELS: Record<AccentColor, string> = {
  purple: "Purple",
  blue: "Blue", 
  green: "Green",
  red: "Red",
  orange: "Orange",
  teal: "Teal"
}

export function AccentColorSelector({ 
  className, 
  showTitle = true,
  onColorChange 
}: AccentColorSelectorProps) {
  const [selectedColor, setSelectedColor] = useState<AccentColor>("purple")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load current accent color from user's profile
  useEffect(() => {
    const loadCurrentColor = async () => {
      try {
        setIsLoading(true)
        const supabase = createClientComponentClient()
        const currentColor = await getUserThemeAccentColorDirect(supabase)
        
        if (currentColor && AVAILABLE_ACCENT_COLORS.includes(currentColor as AccentColor)) {
          setSelectedColor(currentColor as AccentColor)
        }
      } catch (error) {
        console.error("Error loading current accent color:", error)
        // Keep default purple color on error
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrentColor()
  }, [])

  const handleColorSelect = async (color: AccentColor) => {
    if (isSaving || color === selectedColor) return

    try {
      setIsSaving(true)
      const supabase = createClientComponentClient()
      
      // Update in database
      const success = await updateUserThemeAccentColorDirect(supabase, color)
      
      if (success) {
        setSelectedColor(color)
        
        // Update CSS custom property for immediate visual feedback
        const root = window.document.documentElement
        root.style.setProperty("--primary", `var(--color-${color})`)
        root.setAttribute("data-accent", color)
        
        // Call optional callback
        onColorChange?.(color)
        
        // Show success toast
        toast({
          title: "✅ Accent color updated",
          description: `Your theme is now ${COLOR_LABELS[color].toLowerCase()}.`,
          duration: 2000,
        })
      } else {
        throw new Error("Failed to update accent color")
      }
    } catch (error) {
      console.error("Error updating accent color:", error)
      toast({
        title: "Failed to update accent color",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showTitle && (
          <h3 className="text-sm font-medium text-foreground">Accent Color</h3>
        )}
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && (
        <h3 className="text-sm font-medium text-foreground">Accent Color</h3>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {AVAILABLE_ACCENT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={isSaving}
            className={cn(
              "relative rounded-lg border p-3 transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              selectedColor === color
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : "border-border"
            )}
            onClick={() => handleColorSelect(color)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`color-sample color-sample-${color}`} />
              {selectedColor === color && (
                <div className="bg-primary text-primary-foreground rounded-full p-1">
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {COLOR_LABELS[color]}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
} 