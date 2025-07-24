"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { createClientComponentClient } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { PlusIcon, UsersIcon, Trash2 } from "lucide-react"
import NewClassModal from "./new-class-modal"
import { DeleteClassModal } from "@/components/ui/delete-class-modal"
import { useClassDeletion } from "@/hooks/use-class-deletion"
import { isDebugMode } from "@/lib/debug-utils"
import { getStudentCountForClass } from '@/lib/supabase/client'
import { toast } from "sonner"
import { dynamicAccent } from "@/lib/accent-utils"

// Define the Class type
interface Class {
  id: string
  teacher_id: string
  name: string
  description: string
  grade_level: string
  created_at: string
  school_id: string | null
  student_count: number
  class_code: string
}

// Define the Profile type
interface Profile {
  id: string
  school_id: string | null
  role: string
  email: string
  first_name: string
  last_name: string
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supabase, setSupabase] = useState<any>(null)

  // Debug states
  const [authDebug, setAuthDebug] = useState<string[]>([])
  const [dataDebug, setDataDebug] = useState<string[]>([])
  const [performanceDebug, setPerformanceDebug] = useState<string[]>([])

  const router = useRouter()
  const { deleteClass, isDeleting, error: deleteError } = useClassDeletion()

  const addAuthDebug = (info: string) => {
    console.log(`[AUTH] ${info}`)
    setAuthDebug((prev) => [...prev, info])
  }

  const addDataDebug = (info: string) => {
    console.log(`[DATA] ${info}`)
    setDataDebug((prev) => [...prev, info])
  }

  const addPerformanceDebug = (info: string) => {
    console.log(`[PERF] ${info}`)
    setPerformanceDebug((prev) => [...prev, info])
  }

  useEffect(() => {
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

        addDataDebug(`✅ Profile loaded: ${profileData.role} - ${profileData.email}`)
        setProfile(profileData as unknown as Profile);

        // Check if user is a teacher
        if (profileData.role !== "teacher") {
          addAuthDebug("❌ User is not a teacher, redirecting to dashboard")
          router.push("/dashboard")
          return
        }

        addAuthDebug("✅ Teacher role confirmed")

        // Fetch teacher's classes
        addDataDebug("🔍 Fetching classes...")
        const classesStartTime = Date.now()
        const { data: classesData, error: classesError } = await client
          .from("classes")
          .select("*")
          .eq("teacher_id", sessionData.session.user.id)
          .order("created_at", { ascending: false })
        const classesEndTime = Date.now()
        addPerformanceDebug(`⏱️ Classes fetch: ${classesEndTime - classesStartTime}ms`)

        if (classesError) {
          addDataDebug(`❌ Classes error: ${classesError.message}`)
          throw new Error(`Failed to load classes: ${classesError.message}`)
        }

        const classCount = (classesData as unknown[] as Class[])?.length || 0
        addDataDebug(`✅ ${classCount} classes loaded`)

        // For each class, get the student count using the helper
        addDataDebug("🔍 Fetching student counts for each class...")
        const studentCountStartTime = Date.now()
        
        const classesWithStudentCount = await Promise.all(
          ((classesData as unknown[] as Class[]) || []).map(async (classItem: Class, index: number) => {
            const studentStartTime = Date.now()
            const count = await getStudentCountForClass(client, classItem.id);
            const studentEndTime = Date.now()
            addPerformanceDebug(`⏱️ Student count for class ${index + 1}: ${studentEndTime - studentStartTime}ms (${count} students)`)
            return {
              ...classItem,
              student_count: count,
            } as Class;
          })
        );
        
        const studentCountEndTime = Date.now()
        addPerformanceDebug(`⏱️ Total student count queries: ${studentCountEndTime - studentCountStartTime}ms`)
        
        setClasses(classesWithStudentCount);
        addDataDebug(`✅ All classes with student counts loaded`)

        const pageEndTime = Date.now()
        addPerformanceDebug(`🏁 Total page load time: ${pageEndTime - pageStartTime}ms`)
        
      } catch (error: any) {
        addDataDebug(`💥 Load error: ${error.message}`)
        setError(error.message)
      } finally {
        setLoading(false)
        addPerformanceDebug("✅ Loading state set to false")
      }
    }

    loadUserData()
  }, [router])

  const handleDeleteClass = (classItem: Class) => {
    setClassToDelete(classItem)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!classToDelete) return

    const success = await deleteClass(classToDelete.id, classToDelete.name)
    
    if (success) {
      // Remove the deleted class from state
      setClasses(prev => prev.filter(c => c.id !== classToDelete.id))
      setIsDeleteModalOpen(false)
      setClassToDelete(null)
      toast.success(`Class "${classToDelete.name}" deleted successfully`)
      
      // Navigate to classes list if we're on a specific class page
      router.push('/classes')
    } else if (deleteError) {
      toast.error(deleteError)
    }
  }

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false)
      setClassToDelete(null)
    }
  }

  const handleNewClassCreated = async (newClass: {
    name: string
    description: string
    grade_level: string
  }) => {
    if (!supabase || !user || !profile) return

    try {
      setLoading(true)

      // Generate a class code without dashes (e.g., ABC123XYZ)
      const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
        let code = ""

        // Generate 9 characters (no dashes)
        for (let i = 0; i < 9; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        return code
      }

      const classCode = generateCode()

      // Insert the new class
      const { data, error } = await supabase
        .from("classes")
        .insert({
          teacher_id: user.id,
          name: newClass.name,
          description: newClass.description,
          grade_level: newClass.grade_level,
          class_code: classCode,
          school_id: profile.school_id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating class:", error)
        setError("Failed to create class. Please try again.")
        return
      }

      console.log("Class created successfully:", data)

      // Add the new class to the state
      const newClassWithCount = {
        ...data,
        student_count: 0, // New classes start with 0 students
      } as Class

      setClasses(prev => [newClassWithCount, ...prev])
      setIsModalOpen(false)
      
      toast.success(`Class "${newClass.name}" created successfully with code: ${classCode}`)
    } catch (error: any) {
      console.error("Unexpected error creating class:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-background">
        {/* Debug Box 1: Authentication */}
        {isDebugMode() && (
          <div className="fixed top-4 left-4 bg-blue-900/90 text-white p-3 rounded-lg max-w-sm z-50">
            <h4 className="font-bold text-xs mb-2">🔐 Auth Debug:</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {authDebug.map((info, index) => (
                <div key={index} className="font-mono">{info}</div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Box 2: Data Loading */}
        {isDebugMode() && (
          <div className="fixed top-4 right-4 bg-green-900/90 text-white p-3 rounded-lg max-w-sm z-50">
            <h4 className="font-bold text-xs mb-2">📊 Data Debug:</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {dataDebug.map((info, index) => (
                <div key={index} className="font-mono">{info}</div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Box 3: Performance */}
        {isDebugMode() && (
          <div className="fixed bottom-4 left-4 bg-purple-900/90 text-white p-3 rounded-lg max-w-sm z-50">
            <h4 className="font-bold text-xs mb-2">⚡ Performance Debug:</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {performanceDebug.map((info, index) => (
                <div key={index} className="font-mono">{info}</div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md w-full">
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
    <div className="min-h-screen bg-gray-50">
      {/* Debug Box 1: Authentication (Persistent) */}
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

      {/* Debug Box 2: Data Loading (Persistent) */}
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
            <PlusIcon className="h-4 w-4 mr-1" />
            Create New Class
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900">{classItem.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">Grade: {classItem.grade_level}</p>
                  {classItem.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{classItem.description}</p>
                  )}
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <UsersIcon className="h-4 w-4 mr-1" />
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
                      className={`text-center px-4 py-2 ${dynamicAccent.button.primary} rounded-md text-sm font-medium flex-1`}
                    >
                      Create Assignment
                    </Link>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => handleDeleteClass(classItem)}
                      className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 hover:border-red-400 flex items-center justify-center"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Class
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Class Code:</span>
                    <span className="font-mono text-sm">{classItem.class_code}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-600 mb-4">Create your first class to get started.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`${dynamicAccent.button.primary} px-4 py-2 rounded-md text-sm font-medium inline-flex items-center`}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Create New Class
            </button>
          </div>
        )}
      </main>

      <NewClassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleNewClassCreated} />
      
      {classToDelete && (
        <DeleteClassModal
          isOpen={isDeleteModalOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          className={classToDelete.name}
          studentCount={classToDelete.student_count}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
