import { useEffect, useState } from 'react'

/**
 * Hook to safely detect if code is running on the client side
 * Prevents hydration mismatches by returning false on first render (server-side)
 * and true after hydration on the client
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
} 