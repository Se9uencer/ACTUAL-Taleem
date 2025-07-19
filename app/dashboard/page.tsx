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
import { TeacherDashboard } from "./teacher-dashboard"
import { StudentDashboard } from "./student-dashboard"
import { ParentDashboard } from "./parent-dashboard"

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
  const { deleteAssignment, isDeleting } = useAssignmentDeletion()

  const router = useRouter()

  const loadData = useCallback(async () => {
    // Add a timeout for the loading process
    const timeout = setTimeout(() => {
      setError("The dashboard is taking a long time to load. Please try refreshing the page.")
      setLoading(false)
    }, 10000) // 10-second timeout

    try {
      const supabase = createClientComponentClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        clearTimeout(timeout)
        router.push("/login")
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError || !profileData) {
        setError("Failed to load your profile. Please refresh the page.")
        return
      }

      setProfile(profileData)

      if (profileData.role === "teacher") {
        await loadTeacherData(supabase, session.user.id)
      } else if (profileData.role === "student") {
        await loadStudentData(supabase, session.user.id)
      }
    } catch (error: any) {
      console.error("Error loading dashboard:", error)
      setError("An unexpected error occurred while loading the dashboard.")
    } finally {
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
  const handleDeleteAssignment = async (assignmentId: string, assignmentTitle: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${assignmentTitle}"? This action cannot be undone and will remove all associated submissions.`
    )

    if (!confirmed) {
      return
    }

    // Optimistically remove from UI
    const originalAssignments = [...assignments]
    setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))

    // Attempt deletion
    const success = await deleteAssignment(assignmentId)

    if (!success) {
      // Restore the assignment if deletion failed
      setAssignments(originalAssignments)
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
            handleDeleteAssignment={handleDeleteAssignment}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {profile?.first_name || "User"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {profile?.role === "teacher"
              ? "Here's an overview of your classes and assignments."
              : profile?.role === "student"
              ? "Track your progress and upcoming assignments."
              : "Monitor your children's learning progress."}
          </p>
        </div>

        {renderDashboardContent()}
      </div>
    </AuthenticatedLayout>
  )
}
