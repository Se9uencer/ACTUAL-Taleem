"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthDebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev, logMessage])
  }

  useEffect(() => {
    const testAuth = async () => {
      try {
        addLog('🚀 Starting auth debug test...')
        setLoading(true)

        addLog('🔧 Creating Supabase client...')
        const supabase = createClient()
        
        addLog('📞 Calling getSession...')
        const startTime = Date.now()
        
        const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession()
        
        const endTime = Date.now()
        addLog(`⏱️ getSession took ${endTime - startTime}ms`)

        if (sessionError) {
          addLog(`❌ Session error: ${sessionError.message}`)
          setLoading(false)
          return
        }

        if (!sessionData) {
          addLog('📭 No session found')
          setSession(null)
          setLoading(false)
          return
        }

        addLog(`✅ Session found for user: ${sessionData.user.email}`)
        setSession(sessionData)

        if (sessionData.user) {
          addLog('👤 Loading user profile...')
          const profileStartTime = Date.now()
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.user.id)
            .single()

          const profileEndTime = Date.now()
          addLog(`⏱️ Profile query took ${profileEndTime - profileStartTime}ms`)

          if (profileError) {
            addLog(`❌ Profile error: ${profileError.message}`)
          } else if (profileData) {
            addLog(`✅ Profile loaded: ${profileData.role}`)
            setProfile(profileData)
          } else {
            addLog('❓ No profile data returned')
          }
        }

        addLog('🎉 Auth debug test completed')
        setLoading(false)

      } catch (error) {
        addLog(`💥 Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    testAuth()
  }, [])

  const clearLogs = () => {
    setLogs([])
  }

  const testAgain = () => {
    setLogs([])
    setSession(null)
    setProfile(null)
    setLoading(true)
    window.location.reload()
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
        
        {/* Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded">
              <div className="font-medium">Loading</div>
              <div className={loading ? 'text-yellow-600' : 'text-green-600'}>
                {loading ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium">Session</div>
              <div className={session ? 'text-green-600' : 'text-red-600'}>
                {session ? 'Found' : 'None'}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-medium">Profile</div>
              <div className={profile ? 'text-green-600' : 'text-red-600'}>
                {profile ? profile.role : 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Session Data */}
        {session && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session Data</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {/* Profile Data */}
        {profile && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        )}

        {/* Logs */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <div className="space-x-2">
              <button 
                onClick={clearLogs}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Logs
              </button>
              <button 
                onClick={testAgain}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Again
              </button>
            </div>
          </div>
          <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.reload()
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Storage & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 