"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase/client"

interface ClassDeletionBannerProps {
  onDismissAll?: () => void
}

interface DeletionLog {
  id: string
  class_name: string
  message: string
  created_at: string
  dismissed: boolean
}

export function ClassDeletionBanner({ onDismissAll }: ClassDeletionBannerProps) {
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState<string | null>(null)

  useEffect(() => {
    loadDeletionLogs()
  }, [])

  const loadDeletionLogs = async () => {
    try {
      const supabase = createClientComponentClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setLoading(false)
        return
      }

      // Fetch undismissed deletion logs for this student
      const { data: logs, error: logsError } = await supabase
        .from('class_deletion_logs')
        .select('id, class_name, message, created_at, dismissed')
        .eq('student_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })

      if (logsError) {
        console.error('Error fetching deletion logs:', logsError)
        setLoading(false)
        return
      }

      setDeletionLogs((logs as DeletionLog[]) || [])
    } catch (error) {
      console.error('Error loading deletion logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismissLog = async (logId: string) => {
    setDismissing(logId)
    
    try {
      const supabase = createClientComponentClient()
      
      const { error } = await supabase
        .from('class_deletion_logs')
        .update({ 
          dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', logId)

      if (error) {
        console.error('Error dismissing log:', error)
        return
      }

      // Remove from local state
      setDeletionLogs(prev => prev.filter(log => log.id !== logId))
      
      // Call onDismissAll if this was the last log
      if (deletionLogs.length === 1 && onDismissAll) {
        onDismissAll()
      }
    } catch (error) {
      console.error('Error dismissing deletion log:', error)
    } finally {
      setDismissing(null)
    }
  }

  const dismissAll = async () => {
    if (deletionLogs.length === 0) return

    try {
      const supabase = createClientComponentClient()
      const logIds = deletionLogs.map(log => log.id)
      
      const { error } = await supabase
        .from('class_deletion_logs')
        .update({ 
          dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .in('id', logIds)

      if (error) {
        console.error('Error dismissing all logs:', error)
        return
      }

      setDeletionLogs([])
      
      if (onDismissAll) {
        onDismissAll()
      }
    } catch (error) {
      console.error('Error dismissing all deletion logs:', error)
    }
  }

  // Don't show anything if loading or no logs
  if (loading || deletionLogs.length === 0) {
    return null
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Class Deletion Notice{deletionLogs.length > 1 ? 's' : ''}
          </h3>
          <div className="mt-2 text-sm text-yellow-700 space-y-2">
            {deletionLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <p>{log.message}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => dismissLog(log.id)}
                  disabled={dismissing === log.id}
                  className="ml-3 text-yellow-500 hover:text-yellow-700 focus:outline-none"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {deletionLogs.length > 1 && (
            <div className="mt-3">
              <button
                onClick={dismissAll}
                className="text-sm text-yellow-800 hover:text-yellow-900 font-medium underline focus:outline-none"
              >
                Dismiss all notifications
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 