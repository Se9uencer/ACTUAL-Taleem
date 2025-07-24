import { useIsClient } from '@/hooks/use-is-client'

/**
 * Debug utility functions for conditional debug box rendering
 */

/**
 * Checks if debug mode is enabled via environment variable
 * @returns boolean indicating if debug boxes should be shown
 */
export function isDebugMode(): boolean {
  // Check for DEBUG_MODE in environment variables
  return process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || process.env.DEBUG_MODE === 'true'
}

/**
 * React hook-friendly debug mode checker that prevents hydration mismatches
 * Use this in components for conditional debug box rendering
 */
export function useDebugMode(): boolean {
  const isClient = useIsClient()
  
  // Only show debug mode after hydration to prevent mismatches
  return isClient && isDebugMode()
} 