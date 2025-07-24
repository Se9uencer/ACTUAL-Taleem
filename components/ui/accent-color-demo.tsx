"use client"

import { AVAILABLE_ACCENT_COLORS, type AccentColor } from "@/lib/theme-utils"

interface AccentColorDemoProps {
  className?: string
}

const COLOR_LABELS: Record<AccentColor, string> = {
  purple: "Purple",
  blue: "Blue", 
  green: "Green",
  red: "Red",
  orange: "Orange",
  teal: "Teal"
}

export function AccentColorDemo({ className }: AccentColorDemoProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Available Accent Colors</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {AVAILABLE_ACCENT_COLORS.map((color) => (
          <div
            key={color}
            className="flex items-center space-x-3 p-3 border border-border rounded-lg"
          >
            <div className={`color-sample color-sample-${color}`} />
            <div>
              <p className="text-sm font-medium text-foreground">
                {COLOR_LABELS[color]}
              </p>
              <p className="text-xs text-muted-foreground">
                var(--color-{color})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 