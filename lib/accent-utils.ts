/**
 * Utility functions for applying dynamic accent colors
 */

import { type AccentColor } from "./theme-utils"

/**
 * Get dynamic accent color classes that can be used in Tailwind
 */
export const accentColors = {
  // Background colors
  bg: {
    primary: "bg-[var(--primary)]",
    light: "bg-[var(--accent-light)]",
    medium: "bg-[var(--accent-medium)]",
  },
  
  // Text colors
  text: {
    primary: "text-[var(--primary)]",
    foreground: "text-[var(--primary-foreground)]",
  },
  
  // Border colors
  border: {
    primary: "border-[var(--primary)]",
  },
  
  // Hover states
  hover: {
    bg: "hover:bg-[var(--accent-hover)]",
    text: "hover:text-[var(--primary)]",
  },
  
  // Focus states
  focus: {
    ring: "focus:ring-[var(--primary)]",
    border: "focus:border-[var(--primary)]",
  }
} as const

/**
 * Generate dynamic class names for accent colors
 * Use this when you need conditional accent color classes
 */
export function getAccentClasses(accent: AccentColor = "purple") {
  return {
    // Backgrounds
    bg: `bg-${accent}-600`,
    bgLight: `bg-${accent}-50`,
    bgMedium: `bg-${accent}-100`,
    
    // Text
    text: `text-${accent}-600`,
    textLight: `text-${accent}-500`,
    textDark: `text-${accent}-700`,
    textForeground: "text-white",
    
    // Borders
    border: `border-${accent}-200`,
    borderMedium: `border-${accent}-300`,
    borderStrong: `border-${accent}-600`,
    
    // Hover states
    hoverBg: `hover:bg-${accent}-700`,
    hoverText: `hover:text-${accent}-800`,
    
    // Focus states  
    focusRing: `focus:ring-2 focus:ring-${accent}-500`,
    focusBorder: `focus:border-${accent}-500`,
    
    // Loading spinner
    spinner: `border-${accent}-600`,
    spinnerTrack: `border-${accent}-200`,
  }
}

/**
 * CSS custom property approach - more reliable for dynamic theming
 * Use these classes instead of hardcoded color classes
 */
export const dynamicAccent = {
  // Primary button style
  button: {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]",
    secondary: "bg-[var(--accent-light)] text-[var(--primary)] hover:bg-[var(--accent-medium)]",
    outline: "border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--accent-light)]",
  },
  
  // Input styles
  input: {
    focus: "focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
    border: "border-gray-300 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
  },
  
  // Badge styles
  badge: {
    primary: "bg-[var(--accent-light)] text-[var(--primary)]",
    solid: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  },
  
  // Loading spinner
  spinner: {
    border: "border-[var(--accent-medium)] border-t-[var(--primary)]",
    ring: "border-4 border-[var(--accent-medium)] border-t-[var(--primary)]",
  },
  
  // Link styles
  link: {
    primary: "text-[var(--primary)] hover:text-[var(--accent-hover)]",
    underline: "text-[var(--primary)] hover:text-[var(--accent-hover)] underline",
  },
  
  // Icon styles
  icon: {
    primary: "text-[var(--primary)]",
    light: "text-[var(--accent-medium)]",
  }
} as const

/**
 * Safe class concatenation helper
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ")
} 