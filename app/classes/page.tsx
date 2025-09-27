"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@/lib/supabase/client"
import { getStudentCountForClass } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { TaleemLogo } from "@/components/taleem-logo"
import { Plus, Trash2 } from "lucide-react"
import { dynamicAccent } from "@/lib/accent-utils"
import { isDebugMode } from "@/lib/debug-utils"
import { NewClassModal } from "./new-class-modal"
import { DeleteClassModal } from "@/components/ui/delete-class-modal"

interface Class {
  id: string
  name: string
  grade_level: string
  description: string
  student_count: number
  class_code: string
  created_at: string
  schools?: {
    name: string
  }
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteModalData, setDeleteModalData] = useState<{
    isOpen: boolean
    class: Class | null
  }>({ isOpen: false, class: null })

  // Debug states
  const [authDebug, setAuthDebug] = useState<string[]>([])
  const [dataDebug, setDataDebug] = useState<string[]>([])
  const [performanceDebug, setPerformanceDebug] = useState<string[]>([])

  const addAuthDebug = (info: string) => {
    setAuthDebug((prev) => [...prev, info])
  }

  const addDataDebug = (info: string) => {
    setDataDebug((prev) => [...prev, info])
  }

  const addPerformanceDebug = (info: string) => {
    setPerformanceDebug((prev) => [...prev, info])
  }

  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const pageStartTime = Date.now()
      addPerformanceDebug("🚀 Classes page started loading...")

      // Initialize Supabase client
      if (!supabaseConfig.isValid()) {
        addAuthDebug("❌ Invalid Supabase configuration")
        setError("Invalid Supabase configuration")
        setLoading(false)
        return
      }

      addAuthDebug("✅ Supabase config valid")
      const client = createClientComponentClient()
      setSupabase(client)

      // Load user data
      const loadUserData = async () => {
        try {
          addAuthDebug("🔍 Starting authentication check...")
          const authStartTime = Date.now()

          // Check if user is authenticated
          const { data: sessionData, error: sessionError } = await client.auth.getSession()
          const authEndTime = Date.now()
          addPerformanceDebug(`⏱️ Auth check: ${authEndTime - authStartTime}ms`)

          if (sessionError) {
            addAuthDebug(`❌ Session error: ${sessionError.message}`)
            throw new Error(`Authentication error: ${sessionError.message}`)
          }

          if (!sessionData.session) {
            addAuthDebug("❌ No session found, redirecting to login")
            router.push("/login")
            return
          }

          addAuthDebug(`✅ Session found for user: ${sessionData.session.user.id}`)
          setUser(sessionData.session.user)

          // Get user profile
          addDataDebug("🔍 Fetching user profile...")
          const profileStartTime = Date.now()
          const { data: profileData, error: profileError } = await client
            .from("profiles")
            .select("*")
            .eq("id", sessionData.session.user.id)
            .single()
          const profileEndTime = Date.now()
          addPerformanceDebug(`⏱️ Profile fetch: ${profileEndTime - profileStartTime}ms`)

          if (profileError) {
            addDataDebug(`❌ Profile error: ${profileError.message}`)
            throw new Error(`Failed to load profile: ${profileError.message}`)
          }

          if (!profileData) {
            addDataDebug("❌ No profile data found")
            throw new Error("Profile not found")
          }

          addDataDebug(`✅ Profile loaded: ${profileData.role}`)
          setProfile(profileData)

          // Verify user is a teacher
          if (profileData.role !== "teacher") {
            addDataDebug("❌ User is not a teacher, redirecting to dashboard")
            router.push("/dashboard")
            return
          }

          // Load classes for teacher
          addDataDebug("🔍 Fetching classes...")
          const classesStartTime = Date.now()
          const { data: classesData, error: classesError } = await client
            .from("classes")
            .select("*, schools(name)")
            .eq("teacher_id", sessionData.session.user.id)

          if (classesError) {
            addDataDebug(`❌ Classes error: ${classesError.message}`)
            throw new Error(`Failed to load classes: ${classesError.message}`)
          }

          addDataDebug(`✅ Loaded ${classesData?.length || 0} classes`)
          const classesEndTime = Date.now()
          addPerformanceDebug(`⏱️ Classes fetch: ${classesEndTime - classesStartTime}ms`)

          // Add student count to each class
          addDataDebug("🔍 Fetching student counts for each class...")
          const studentCountStartTime = Date.now()
          const classesWithCounts = await Promise.all(
            (classesData || []).map(async (classItem: any) => {
              const studentCount = await getStudentCountForClass(client, classItem.id)
              addPerformanceDebug(
                `Student count for class ${classItem.id}: ${Date.now() - studentCountStartTime}ms (${studentCount} students)`
              )
              return { ...classItem, student_count: studentCount }
            })
          )

          const studentCountEndTime = Date.now()
          addPerformanceDebug(`Total student count queries: ${studentCountEndTime - studentCountStartTime}ms`)

          setClasses(classesWithCounts)
          addDataDebug("✅ All classes with student counts loaded")

          const totalEndTime = Date.now()
          addPerformanceDebug(`Total page load time: ${totalEndTime - pageStartTime}ms`)
          addPerformanceDebug("✅ Loading state set to false")
        } catch (error: any) {
          addAuthDebug(`💥 Error in loadUserData: ${error.message}`)
          console.error("Error loading user data:", error)
          setError(error.message || "An unexpected error occurred")
        } finally {
          setLoading(false)
        }
      }

      await loadUserData()
    } catch (error: any) {
      console.error("Error loading classes:", error)
      setError(error.message || "An unexpected error occurred")
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteClass = (classItem: Class) => {
    setDeleteModalData({
      isOpen: true,
      class: classItem,
    })
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalData.class) {
      try {
        const client = createClientComponentClient()
        const { error } = await client.from("classes").delete().eq("id", deleteModalData.class!.id)

        if (error) {
          console.error("Error deleting class:", error)
          alert("Failed to delete class. Please try again.")
          return
        }

        // Refresh the classes list
        await loadData()
        setDeleteModalData({ isOpen: false, class: null })
      } catch (error) {
        console.error("Error deleting class:", error)
        alert("Failed to delete class. Please try again.")
      }
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalData({ isOpen: false, class: null })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <TaleemLogo className={`h-12 w-auto ${dynamicAccent.icon.primary} mb-4`} />
        <p className="text-gray-700 mb-2">Loading your classes...</p>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${dynamicAccent.button.primary} animate-pulse`}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className={`px-4 py-2 ${dynamicAccent.button.primary} rounded transition-colors`}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Debug Box 1: Auth (Top Left) */}
      {isDebugMode() && (
        <div className="fixed top-4 left-4 bg-blue-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">🔐 Auth Debug:</h4>
          <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
            {authDebug.slice(-5).map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Box 2: Data (Top Right) */}
      {isDebugMode() && (
        <div className="fixed top-4 right-4 bg-green-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">📊 Data Debug:</h4>
          <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
            {dataDebug.slice(-5).map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Box 3: Performance (Persistent) */}
      {isDebugMode() && (
        <div className="fixed bottom-4 left-4 bg-purple-900/90 text-white p-3 rounded-lg max-w-sm z-50">
          <h4 className="font-bold text-xs mb-2">⚡ Performance Debug:</h4>
          <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
            {performanceDebug.slice(-8).map((info, index) => (
              <div key={index} className="font-mono">{info}</div>
            ))}
          </div>
          <div className="text-xs mt-2 opacity-70">
            Classes: {classes.length} | Total Load Time Available ↑
          </div>
        </div>
      )}

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <TaleemLogo className={`h-8 w-auto ${dynamicAccent.icon.primary} mr-2`} />
            <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile?.email}{" "}
              ({profile?.role})
            </span>
            <Link href="/dashboard" className={`text-sm ${dynamicAccent.link.primary}`}>
              Dashboard
            </Link>
            <Link href="/profile" className={`text-sm ${dynamicAccent.link.primary}`}>
              My Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Classes</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`${dynamicAccent.button.primary} px-4 py-2 rounded-md text-sm font-medium flex items-center`}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create New Class
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className={`${dynamicAccent.button.primary} px-4 py-2 rounded-md text-sm font-medium flex items-center mx-auto`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create New Class
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <div key={classItem.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{classItem.name}</h3>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Grade: {classItem.grade_level}</p>
                    <p className="text-sm text-gray-600">{classItem.description}</p>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <svg
                      className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>
                      {classItem.student_count} {classItem.student_count === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/classes/${classItem.id}`}
                      className="text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex-1"
                    >
                      View Class
                    </Link>
                    <Link
                      href={`/assignments/new?class=${classItem.id}`}
                      className="text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex-1"
                    >
                      Create Assignment
                    </Link>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => handleDeleteClass(classItem)}
                      className="w-full text-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Class
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Class Code: {classItem.class_code}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Class Modal */}
      <NewClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          loadData()
        }}
      />

      {/* Delete Class Modal */}
      <DeleteClassModal
        isOpen={deleteModalData.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        className={deleteModalData.class?.name || ""}
        studentCount={deleteModalData.class?.student_count || 0}
      />
    </div>
  )
}