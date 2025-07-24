"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@/lib/supabase/client"
import { getStudentCountForClass } from "@/lib/supabase/client"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, BookOpen, CheckCircle, Trash2, XCircle, School, User } from "lucide-react"
import { formatDatePST } from "@/lib/date-utils"
import { useAssignmentDeletion } from "@/hooks/use-assignment-deletion"
import { isDebugMode } from "@/lib/debug-utils"
import { DeleteAssignmentModal } from "@/components/ui/delete-assignment-modal"
import { TeacherDashboard } from "./teacher-dashboard"
import { StudentDashboard } from "./student-dashboard"
import { ParentDashboard } from "./parent-dashboard"
import { ClassDeletionBanner } from "@/components/ui/class-deletion-banner"

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [recitations, setRecitations] = useState<any[]>([])
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([])
  const [lateSubmissions, setLateSubmissions] = useState<any[]>([])
  const [showLateAlert, setShowLateAlert] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalData, setDeleteModalData] = useState<{
    isOpen: boolean
    assignment: any | null
  }>({ isOpen: false, assignment: null })
  const { deleteAssignment, isDeleting } = useAssignmentDeletion()

  // Debug state
  const [debugData, setDebugData] = useState<string[]>([])
  const [dashboardTiming, setDashboardTiming] = useState<string[]>([])

  const addDebug = (message: string) => {
    const timestamp = new Date().toISOString()
    const debugMsg = `${timestamp}: ${message}`
    setDebugData(prev => [...prev, debugMsg])
    console.log(`[Dashboard] ${debugMsg}`)
  }

  const addTiming = (message: string) => {
    const timestamp = new Date().toISOString()
    const timingMsg = `${timestamp}: ${message}`
    setDashboardTiming(prev => [...prev, timingMsg])
    console.log(`[DashTiming] ${timingMsg}`)
  }

  const router = useRouter()

  const loadData = useCallback(async () => {
    addDebug('🏠 Dashboard loadData started')
    addTiming('⏱️ Dashboard data loading initiated')

    // Add a timeout for the loading process
    const timeout = setTimeout(() => {
      addDebug('⏰ Dashboard loading timeout reached (10s)')
      addTiming('⏱️ Dashboard loading timed out')
      setError("The dashboard is taking a long time to load. Please try refreshing the page.")
      setLoading(false)
    }, 10000) // 10-second timeout

    try {
      addDebug('🔧 Creating Supabase client in dashboard...')
      const supabase = createClientComponentClient()
      
      addDebug('🔍 Getting session in dashboard...')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        addDebug('❌ Dashboard: No session found, redirecting to login')
        addTiming('⏱️ Dashboard redirecting - no session')
        clearTimeout(timeout)
        router.push("/login")
        return
      }

      addDebug(`✅ Dashboard session confirmed for user: ${session.user.email}`)
      addTiming('⏱️ Loading user profile...')
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError || !profileData) {
        addDebug(`❌ Dashboard profile error: ${profileError?.message || 'No profile data'}`)
        addTiming('⏱️ Dashboard profile loading failed')
        setError("Failed to load your profile. Please refresh the page.")
        return
      }

      addDebug(`✅ Dashboard profile loaded: Role=${profileData.role}, Name=${profileData.first_name}`)
      setProfile(profileData)

      if (profileData.role === "teacher") {
        addDebug('📚 Loading teacher-specific data...')
        addTiming('⏱️ Starting teacher data load')
        await loadTeacherData(supabase, session.user.id)
        addTiming('⏱️ Teacher data load completed')
      } else if (profileData.role === "student") {
        addDebug('🎓 Loading student-specific data...')
        addTiming('⏱️ Starting student data load')
        await loadStudentData(supabase, session.user.id)
        addTiming('⏱️ Student data load completed')
      }
    } catch (error: any) {
      addDebug(`💥 Dashboard loading error: ${error.message || error}`)
      addTiming('⏱️ Dashboard loading failed with error')
      console.error("Error loading dashboard:", error)
      setError("An unexpected error occurred while loading the dashboard.")
    } finally {
      addDebug('🏁 Dashboard loading process completed')
      addTiming('⏱️ Dashboard loading finalized')
      clearTimeout(timeout)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadTeacherData = async (supabase: any, userId: string) => {
    try {
      // Fetch teacher's classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })

      if (classesError) {
        console.error("Error fetching classes:", classesError.message)
        throw new Error("Failed to load classes.")
      }

      // For each class, get the student count using the helper
      const classesWithDetails = await Promise.all(
        (classesData || []).map(async (classItem: any) => {
          try {
            const count = await getStudentCountForClass(supabase, classItem.id)
            return {
              ...classItem,
              student_count: count,
            }
          } catch (error) {
            console.error(`Failed to get student count for class ${classItem.id}:`, error)
            return {
              ...classItem,
              student_count: "Error", // Display an error state for this specific class
            }
          }
        }),
      )
      setClasses(classesWithDetails)

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title, surah, due_date, class_id, teacher_id, surah_name, start_ayah, end_ayah")
        .eq("teacher_id", userId)
        .gte("due_date", new Date().toISOString().split("T")[0])
        .order("due_date", { ascending: true })

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError.message)
        throw new Error("Failed to load assignments.")
      }

      if (assignmentsData && assignmentsData.length > 0) {
        // Get unique class IDs
        const classIds = [...new Set(assignmentsData.map((a: any) => a.class_id).filter(Boolean))]

        // Fetch class names
        const { data: classNamesData, error: classNamesError } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", classIds)

        if (classNamesError) {
          console.error("Error fetching class names:", classNamesError.message)
          // Continue without class names if this fails
        }

        // Create a map of class IDs to names
        const classMap = (classNamesData || []).reduce((map: any, c: any) => {
          map[c.id] = c.name
          return map
        }, {})

        // Add class names to assignments
        const formattedAssignments = assignmentsData.map((assignment: any) => ({
          ...assignment,
          class_name: assignment.class_id ? classMap[assignment.class_id] : undefined,
        }))

        setAssignments(formattedAssignments)
        // Fetch latest recitations for all assignments
        const assignmentIds = formattedAssignments.map((a: any) => a.id)
        if (assignmentIds.length > 0) {
          const { data: recitationsData, error: recitationsError } = await supabase
            .from("recitations")
            .select(
              "id, assignment_id, student_id, submitted_at, is_latest, assignments(id, title, due_date), profiles(id, first_name, last_name)",
            )
            .in("assignment_id", assignmentIds)
            .eq("is_latest", true)

          if (recitationsError) {
            console.error("Error fetching recitations:", recitationsError.message)
            // Continue without recitation data
          }

          // Find late submissions
          const late = (recitationsData || [])
            .filter((rec: any) => {
              const due = new Date(rec.assignments?.due_date)
              const submitted = new Date(rec.submitted_at)
              return submitted > due
            })
            .map((rec: any) => ({
              id: rec.id,
              student: rec.profiles ? `${rec.profiles.first_name} ${rec.profiles.last_name}` : rec.student_id,
              assignment: rec.assignments?.title || rec.assignment_id,
              submitted_at: rec.submitted_at,
              due_date: rec.assignments?.due_date,
            }))
          setLateSubmissions(late)
        }
      } else {
        setAssignments([])
      }
    } catch (error) {
      console.error("Error loading teacher data:", error)
      // We are already handling the error display in the main loadData function.
      // Re-throwing the error will allow the main catch block to handle it.
      throw error
    }
  }

  const loadStudentData = async (supabase: any, userId: string) => {
    try {
      // Fetch student's recitations
      const { data: recitationsData, error: recitationsError } = await supabase
        .from("recitations")
        .select("*, assignments(*), feedback(*)")
        .eq("student_id", userId)
        .eq("is_latest", true)
        .order("submitted_at", { ascending: false })

      if (recitationsError) {
        console.error("Error fetching student recitations:", recitationsError.message)
        throw new Error("Failed to load your submissions.")
      }

      setRecitations(recitationsData || [])

      // Fetch student's enrolled classes
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", userId)

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError.message)
        throw new Error("Failed to load your class enrollments.")
      }

      if (enrollmentsData && enrollmentsData.length > 0) {
        const classIds = enrollmentsData.map((e: any) => e.class_id)

        const { data: classesData, error: studentClassesError } = await supabase
          .from("classes")
          .select("*")
          .in("id", classIds)

        if (studentClassesError) {
          console.error("Error fetching student classes:", studentClassesError.message)
          throw new Error("Failed to load your classes.")
        }

        // For each class, fetch the student count using the helper
        const classesWithCounts = await Promise.all(
          (classesData || []).map(async (classItem: any) => {
            try {
              const count = await getStudentCountForClass(supabase, classItem.id)
              return {
                ...classItem,
                student_count: count,
              }
            } catch (error) {
              console.error(`Failed to get student count for class ${classItem.id}:`, error)
              return {
                ...classItem,
                student_count: "N/A",
              }
            }
          }),
        )
        setClasses(classesWithCounts)
      } else {
        setClasses([])
      }

      // Fetch assignments
      const { data: assignmentStudents, error: assignmentStudentsError } = await supabase
        .from("assignment_students")
        .select("assignment_id")
        .eq("student_id", userId)

      if (assignmentStudentsError) {
        console.error("Error fetching assigned assignments:", assignmentStudentsError.message)
        throw new Error("Failed to load your assignments.")
      }

      if (assignmentStudents && assignmentStudents.length > 0) {
        const assignmentIds = assignmentStudents.map((item: any) => item.assignment_id)

        const { data: studentAssignments, error: studentAssignmentsError } = await supabase
          .from("assignments")
          .select("*")
          .in("id", assignmentIds)
          .gte("due_date", new Date().toISOString().split("T")[0])
          .order("due_date", { ascending: true })

        if (studentAssignmentsError) {
          console.error("Error fetching student assignments:", studentAssignmentsError.message)
          throw new Error("Failed to load assignment details.")
        }

        if (studentAssignments && studentAssignments.length > 0) {
          // Get class names
          const classIds = [...new Set(studentAssignments.map((a: any) => a.class_id).filter(Boolean))]

          if (classIds.length > 0) {
            const { data: classesData, error: classNamesError } = await supabase
              .from("classes")
              .select("id, name")
              .in("id", classIds)

            if (classNamesError) {
              console.error("Error fetching class names for assignments:", classNamesError.message)
              // Continue without class names
            }

            const classMap = (classesData || []).reduce((map: any, c: any) => {
              map[c.id] = c.name
              return map
            }, {})

            const formattedAssignments = studentAssignments.map((assignment: any) => ({
              ...assignment,
              class_name: assignment.class_id ? classMap[assignment.class_id] : undefined,
            }))

            // Check which assignments have been submitted
            const { data: latestRecitations, error: recitationsError } = await supabase
              .from("recitations")
              .select("assignment_id")
              .eq("student_id", userId)
              .eq("is_latest", true)

            if (recitationsError) {
              console.error("Error fetching latest recitations:", recitationsError.message)
              // Continue, but submitted status may be inaccurate
            }

            const submittedAssignmentIds = new Set(latestRecitations?.map((r: any) => r.assignment_id) || [])

            const pendingAssignments: any[] = []
            const completed: any[] = []

            for (const assignment of formattedAssignments || []) {
              if (submittedAssignmentIds.has(assignment.id)) {
                completed.push(assignment)
              } else {
                pendingAssignments.push(assignment)
              }
            }

            setAssignments(pendingAssignments)
            setCompletedAssignments(completed)
          } else {
            setAssignments(studentAssignments)
          }
        } else {
          setAssignments([])
        }
      } else {
        setAssignments([])
      }
    } catch (error) {
      console.error("Error loading student data:", error)
      throw error
    }
  }

  // Handle assignment deletion
  const handleDeleteClick = (assignment: any) => {
    setDeleteModalData({ isOpen: true, assignment })
  }

  const handleDeleteConfirm = async () => {
    const assignment = deleteModalData.assignment
    if (!assignment) return

    // Optimistically remove from UI
    const originalAssignments = [...assignments]
    setAssignments(prev => prev.filter(a => a.id !== assignment.id))

    // Attempt deletion
    const success = await deleteAssignment(assignment.id)

    if (success) {
      setDeleteModalData({ isOpen: false, assignment: null })
    } else {
      // Restore the assignment if deletion failed
      setAssignments(originalAssignments)
      setDeleteModalData({ isOpen: false, assignment: null })
    }
  }

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteModalData({ isOpen: false, assignment: null })
    }
  }

  // Helper function to generate assignment title
  const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
    if (!surahName) return "Assignment"

    // Extract just the surah name without the number and parentheses
    const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0]

    if (startAyah === endAyah) {
      return `${surahNameOnly} - Ayah ${startAyah}`
    }
    return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`
  }

  // Format date to display in a readable format
  const formatDate = (dateString: string) => {
    return formatDatePST(dateString, { month: "short", day: "numeric" })
  }

  const renderDashboardContent = () => {
    if (loading || !profile) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          
          {/* Debug Box 1: Dashboard Flow */}
          {isDebugMode() && (
            <div className="fixed bottom-4 left-4 bg-green-900/90 text-white p-3 rounded-lg max-w-md z-50">
              <h4 className="font-bold text-xs mb-2">🏠 Dashboard Debug:</h4>
              <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {debugData.map((info, index) => (
                  <div key={index} className="font-mono text-xs leading-tight">{info}</div>
                ))}
              </div>
              <div className="text-xs mt-2 opacity-70 border-t border-green-700 pt-1">
                Loading: {loading.toString()} | Profile: {profile ? 'Loaded' : 'None'} | Error: {error || 'None'}
              </div>
            </div>
          )}

          {/* Debug Box 2: Dashboard Timing */}
          {isDebugMode() && (
            <div className="fixed bottom-4 right-4 bg-orange-900/90 text-white p-3 rounded-lg max-w-md z-50">
              <h4 className="font-bold text-xs mb-2">⏱️ Dashboard Timing:</h4>
              <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {dashboardTiming.map((info, index) => (
                  <div key={index} className="font-mono text-xs leading-tight">{info}</div>
                ))}
              </div>
              <div className="text-xs mt-2 opacity-70 border-t border-orange-700 pt-1">
                Steps: {dashboardTiming.length} | Classes: {classes.length} | Assignments: {assignments.length}
              </div>
            </div>
          )}
        </div>
      )
    }

    switch (profile.role) {
      case "teacher":
        return (
          <TeacherDashboard
            profile={profile}
            classes={classes}
            assignments={assignments}
            handleDeleteAssignment={handleDeleteClick}
            isDeleting={isDeleting}
          />
        )
      case "student":
        return (
          <StudentDashboard
            classes={classes}
            assignments={assignments}
            completedAssignments={completedAssignments}
          />
        )
      case "parent":
        return <ParentDashboard />
      default:
        return <p>Welcome! Your dashboard is being set up.</p>
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Late Submissions Alert */}
        {profile?.role === "teacher" && lateSubmissions.length > 0 && showLateAlert && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 rounded p-4 mb-6 relative">
            <button
              className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
              onClick={() => setShowLateAlert(false)}
              aria-label="Dismiss late submissions alert"
            >
              <XCircle className="h-5 w-5" />
            </button>
            <strong>Late Submissions:</strong>
            <ul className="mt-2 space-y-1">
              {lateSubmissions.map((rec) => (
                <li key={rec.id}>
                  <span className="font-semibold">{rec.student}</span> submitted <span className="font-semibold">{rec.assignment}</span> late (submitted {formatDatePST(rec.submitted_at)}; due {formatDatePST(rec.due_date)})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || "User"}!
          </h1>
          <p className="text-gray-600 mt-2">
            {profile?.role === "teacher"
              ? "Here's an overview of your classes and assignments."
              : profile?.role === "student"
              ? "Track your progress and upcoming assignments."
              : "Monitor your children's learning progress."}
          </p>
        </div>

        {/* Class Deletion Notifications for Students */}
        {profile?.role === "student" && (
          <ClassDeletionBanner />
        )}

        {renderDashboardContent()}
      </div>

      {deleteModalData.assignment && (
        <DeleteAssignmentModal
          isOpen={deleteModalData.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          assignmentTitle={
            deleteModalData.assignment.title ||
            (deleteModalData.assignment.surah_name && deleteModalData.assignment.start_ayah && deleteModalData.assignment.end_ayah
              ? generateAssignmentTitle(deleteModalData.assignment.surah_name, deleteModalData.assignment.start_ayah, deleteModalData.assignment.end_ayah)
              : deleteModalData.assignment.surah)
          }
          submissionCount={0} // Dashboard doesn't show submission count
          studentCount={0} // Dashboard doesn't show student count
          isDeleting={isDeleting}
        />
      )}
    </AuthenticatedLayout>
  )
}
