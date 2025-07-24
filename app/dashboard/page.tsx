"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
import { useAuth } from "@/contexts/auth-context"

export default function DashboardPage() {
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

  // Get auth state from context
  const { user, profile } = useAuth()

  // Debug state (simplified)
  const [debugData, setDebugData] = useState<string[]>([])

  const addDebug = (message: string) => {
    const debugMsg = `${message}`
    setDebugData(prev => [...prev, debugMsg])
    console.log(`[Dashboard] ${debugMsg}`)
  }

  const router = useRouter()

  const loadData = useCallback(async () => {
    if (!user || !profile) {
      addDebug('❌ Dashboard: No user or profile available')
      return
    }

    addDebug('🏠 Dashboard loadData started')
    setLoading(true)

    try {
      addDebug('🔧 Creating Supabase client in dashboard...')
      const supabase = createClient()

      addDebug(`✅ Dashboard loading data for user: ${profile.role}`)
      
      if (profile.role === "teacher") {
        addDebug('👨‍🏫 Loading teacher data...')

        // Load classes for teacher
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*, schools(name)")
          .eq("teacher_id", user.id)

        if (classesError) {
          console.error("Error loading classes:", classesError)
          setError("Failed to load classes")
          return
        }

        addDebug(`✅ Loaded ${classesData?.length || 0} classes`)
        
                 // Add student count to each class
         const classesWithCounts = await Promise.all(
           (classesData || []).map(async (classItem: any) => {
             const studentCount = await getStudentCountForClass(supabase, classItem.id)
             return { ...classItem, student_count: studentCount }
           })
         )

        setClasses(classesWithCounts)

        // Load assignments for teacher
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false })

        if (assignmentsError) {
          console.error("Error loading assignments:", assignmentsError)
        } else {
          addDebug(`✅ Loaded ${assignmentsData?.length || 0} assignments`)
          setAssignments(assignmentsData || [])
        }

        // Load late submissions
        const { data: lateData, error: lateError } = await supabase
          .from("recitations")
          .select(`
            id, submitted_at, assignment_id,
            assignments!inner(title, due_date, teacher_id, surah_name, start_ayah, end_ayah),
            profiles!inner(first_name, last_name)
          `)
          .eq("assignments.teacher_id", user.id)
          .not("submitted_at", "is", null)

                 if (!lateError && lateData) {
           const actuallyLate = lateData.filter((rec: any) => {
             const submittedAt = new Date(rec.submitted_at)
             const dueDate = new Date(rec.assignments.due_date)
             return submittedAt > dueDate
           }).map((rec: any) => ({
             ...rec,
             student: `${rec.profiles.first_name} ${rec.profiles.last_name}`,
             assignment: rec.assignments.title || `${rec.assignments.surah_name} ${rec.assignments.start_ayah}-${rec.assignments.end_ayah}`,
             due_date: rec.assignments.due_date
           }))

          setLateSubmissions(actuallyLate)
        }

      } else if (profile.role === "student") {
        addDebug('👨‍🎓 Loading student data...')

        // Load classes for student
        const { data: classesData, error: classesError } = await supabase
          .from("class_students")
          .select(`
            class_id,
            classes!inner(id, name, grade_level, teacher_id, created_at, schools(name))
          `)
          .eq("student_id", user.id)

        if (classesError) {
          console.error("Error loading student classes:", classesError)
          setError("Failed to load classes")
          return
        }

                 const studentClasses = classesData?.map((item: any) => item.classes) || []
        setClasses(studentClasses)
        addDebug(`✅ Loaded ${studentClasses.length} classes`)

        // Load assignments for student
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignment_students")
          .select(`
            assignment_id,
            assignments!inner(*)
          `)
          .eq("student_id", user.id)

        if (assignmentsError) {
          console.error("Error loading student assignments:", assignmentsError)
        } else {
                     const studentAssignments = assignmentsData?.map((item: any) => item.assignments) || []
          setAssignments(studentAssignments)
          addDebug(`✅ Loaded ${studentAssignments.length} assignments`)

          // Load completed assignments
          const completedIds = new Set()
          const { data: recitationsData, error: recitationsError } = await supabase
            .from("recitations")
            .select("assignment_id")
            .eq("student_id", user.id)
            .not("submitted_at", "is", null)

                     if (!recitationsError && recitationsData) {
             recitationsData.forEach((rec: any) => completedIds.add(rec.assignment_id))
             const completed = studentAssignments.filter((a: any) => completedIds.has(a.id))
            setCompletedAssignments(completed)
            addDebug(`✅ Found ${completed.length} completed assignments`)
          }
        }
      }

      setLoading(false)
      addDebug('✅ Dashboard data loading completed')

    } catch (error: any) {
      console.error("Error loading dashboard data:", error)
      setError(error.message || "Failed to load dashboard data")
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (user && profile) {
      loadData()
    }
  }, [user, profile, loadData])

  // Delete assignment handlers
  const handleDeleteClick = (assignment: any) => {
    setDeleteModalData({
      isOpen: true,
      assignment,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteModalData({ isOpen: false, assignment: null })
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalData.assignment) {
      await deleteAssignment(deleteModalData.assignment.id)
      setDeleteModalData({ isOpen: false, assignment: null })
      // Reload data after deletion
      loadData()
    }
  }

  const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
    return `${surahName} ${startAyah}-${endAyah}`
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null)
                loadData()
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const renderDashboardContent = () => {
    if (!profile) {
      return <p>Loading your dashboard...</p>
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
        {/* Debug Box */}
        {isDebugMode() && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 text-white p-3 rounded-lg max-w-sm z-50">
            <h4 className="font-bold text-xs mb-2">📊 Dashboard Debug:</h4>
            <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
              {debugData.slice(-5).map((info, index) => (
                <div key={index} className="font-mono">{info}</div>
              ))}
            </div>
            <div className="text-xs mt-2 opacity-70">
              User: {profile?.first_name} | Role: {profile?.role}
            </div>
          </div>
        )}

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
          submissionCount={0}
          studentCount={0}
          isDeleting={isDeleting}
        />
      )}
    </AuthenticatedLayout>
  )
}
