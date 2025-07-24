import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'

interface UseClassDeletionReturn {
  deleteClass: (classId: string, className: string) => Promise<boolean>
  isDeleting: boolean
  error: string | null
}

export function useClassDeletion(): UseClassDeletionReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteClass = async (classId: string, className: string): Promise<boolean> => {
    if (!classId) {
      setError('Class ID is required')
      return false
    }

    setIsDeleting(true)
    setError(null)

    try {
      const supabase = createClientComponentClient()
      
      // Get the current session for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('You must be logged in to delete classes')
      }

      // Make the API call to delete the class
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete class')
      }

      console.log(`Class "${className}" deleted successfully. ${result.studentsNotified} students notified.`)
      return true

    } catch (err: any) {
      console.error('Error deleting class:', err)
      setError(err.message || 'An unexpected error occurred')
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteClass,
    isDeleting,
    error
  }
} 