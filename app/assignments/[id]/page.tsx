"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@/lib/supabase/client"
import { getStudentCountForAssignment } from "@/lib/supabase/client"
import { TaleemLogo } from "@/components/taleem-logo"
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Edit,
} from "lucide-react"
import { formatDateTimePST, isPastDuePST } from "@/lib/date-utils"
import SubmissionsList from "./submissions-list"
import { useAssignmentDeletion } from "@/hooks/use-assignment-deletion"
import { DeleteAssignmentModal } from "@/components/ui/delete-assignment-modal"

interface Assignment {
  id: string
  title: string
  surah: string
  surah_name?: string
  start_ayah?: number
  end_ayah?: number
  due_date: string
  created_at: string
  class_id: string
  teacher_id: string
  class_name?: string
  submission_count?: number
}

export default function AssignmentDetailsPage() {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [className, setClassName] = useState<string>("")
  const [submissionCount, setSubmissionCount] = useState<number>(0)
  const [studentCount, setStudentCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [assignedStudents, setAssignedStudents] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { deleteAssignment, isDeleting } = useAssignmentDeletion()

  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()

        // Check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          router.push("/login")
          return
        }

        // Fetch assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single()

        if (assignmentError || !assignmentData) {
          setError("Assignment not found")
          setLoading(false)
          return
        }

        // Check if the teacher owns this assignment
        if (assignmentData.teacher_id !== sessionData.session.user.id) {
          setError("You don't have permission to view this assignment")
          setLoading(false)
          return
        }

        setAssignment(assignmentData as unknown as Assignment);

        // Get class name
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("name")
          .eq("id", String(assignmentData.class_id))
          .single()

        if (!classError && classData) {
          setClassName(String(classData.name))
        }

        // Get submission count
        const { count: submissionCountData, error: submissionCountError } = await supabase
          .from("recitations")
          .select("*", { count: "exact", head: true })
          .eq("assignment_id", assignmentId)

        if (!submissionCountError) {
          setSubmissionCount(submissionCountData || 0)
        }

        // Get student count for this assignment using the helper
        const studentCount = await getStudentCountForAssignment(supabase, assignmentId);
        setStudentCount(studentCount);

        // Fetch all students in the class
        const { data: classStudentsData, error: classStudentsError } = await supabase
          .from("class_students")
          .select("profiles(id, first_name, last_name)")
          .eq("class_id", String(assignmentData.class_id))

        if (classStudentsError) {
          console.error("Error fetching class students:", classStudentsError)
        } else {
          const students = classStudentsData as { profiles: any }[] | null
          setClassStudents(students?.map(s => s.profiles).filter(Boolean) || [])
        }

        // Fetch currently assigned students
        const { data: assignedStudentsData, error: assignedStudentsError } = await supabase
          .from("assignment_students")
          .select("student_id")
          .eq("assignment_id", assignmentId)

        if (assignedStudentsError) {
          console.error("Error fetching assigned students:", assignedStudentsError)
        } else {
          setAssignedStudents(
            assignedStudentsData?.map((s: { student_id: any }) => s.student_id as string).filter(Boolean) || []
          )
        }

        setLoading(false)
      } catch (err: any) {
        console.error("Error loading assignment:", err)
        setError(err.message || "An unexpected error occurred")
        setLoading(false)
      }
    }

    if (assignmentId) {
      loadData()
    }
  }, [assignmentId, router])

  const handleStudentSelectionChange = (studentId: string) => {
    setAssignedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    setAssignedStudents(classStudents.map(s => s.id))
  }

  const handleDeselectAll = () => {
    setAssignedStudents([])
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const supabase = createClientComponentClient()

      // First, delete all existing assignments for this assignment
      const { error: deleteError } = await supabase
        .from("assignment_students")
        .delete()
        .eq("assignment_id", assignmentId)

      if (deleteError) throw deleteError

      // Then, insert the new set of assigned students
      if (assignedStudents.length > 0) {
        const newAssignments = assignedStudents.map(studentId => ({
          assignment_id: assignmentId,
          student_id: studentId,
        }))
        const { error: insertError } = await supabase
          .from("assignment_students")
          .insert(newAssignments)
        
        if (insertError) throw insertError
      }

      // Refresh student and submission count after saving
      const studentCount = await getStudentCountForAssignment(supabase, assignmentId)
      setStudentCount(studentCount)
      const { count: submissionCountData } = await supabase
        .from("recitations")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", assignmentId)
      setSubmissionCount(submissionCountData || 0)

    } catch (err: any) {
      setError("Failed to save changes. Please try again.")
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle assignment deletion
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assignment) return

    // Attempt deletion
    const success = await deleteAssignment(assignment.id)

    if (success) {
      setIsDeleteModalOpen(false)
      // Redirect to the class page after successful deletion
      router.push(`/classes/${assignment.class_id}`)
    }
  }

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false)
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
    return formatDateTimePST(dateString)
  }

  // Check if an assignment is past due
  const isPastDue = (dueDate: string) => {
    return isPastDuePST(dueDate)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading assignment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Assignment Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The assignment you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <TaleemLogo className="h-8 w-auto text-purple-600 mr-2" />
            <h1 className="text-2xl font-bold text-foreground">Assignment Details</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-purple-600 hover:text-purple-800">
              Back to Dashboard
            </Link>
            <Link
              href={`/assignments/${assignment.id}/edit`}
              className="text-purple-600 hover:text-purple-800 font-medium flex items-center"
              title="Edit assignment"
            >
              <Edit className="h-5 w-5 mr-1" />
              Edit Assignment
            </Link>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-800 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete assignment"
            >
              <Trash2 className="h-5 w-5 mr-1" />
              Delete Assignment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/classes/${assignment.class_id}`}
            className="inline-flex items-center text-purple-600 hover:text-purple-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {className || "Class"}
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-foreground">
              {assignment.title ||
                (assignment.surah_name && assignment.start_ayah && assignment.end_ayah
                  ? generateAssignmentTitle(assignment.surah_name, assignment.start_ayah, assignment.end_ayah)
                  : assignment.surah)}
            </h2>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center text-gray-600">
                <BookOpen className="h-5 w-5 mr-2 text-purple-500" />
                <span>
                  {assignment.surah_name
                    ? `${assignment.surah_name.split(" (")[0].replace(/^\d+\.\s+/, "")}${
                        assignment.start_ayah && assignment.end_ayah
                          ? `, Ayahs ${assignment.start_ayah}-${assignment.end_ayah}`
                          : ""
                      }`
                    : `Surah: ${assignment.surah}`}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                <span>Due: {formatDate(assignment.due_date)}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-2 text-purple-500" />
                <span className={isPastDue(assignment.due_date) ? "text-red-600" : "text-green-600"}>
                  {isPastDue(assignment.due_date) ? "Past Due" : "Active"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  <h3 className="font-medium text-purple-800">Assigned To</h3>
                </div>
                <p className="text-3xl font-bold text-purple-900 mt-2">{studentCount}</p>
                <p className="text-sm text-purple-700">
                  {assignedStudents.length === classStudents.length ? "All students (at creation)" : "Selected students"}
                </p>
                {assignedStudents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {classStudents
                      .filter(student => assignedStudents.includes(student.id))
                      .slice(0, 3)
                      .map(student => (
                        <span
                          key={student.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {student.first_name} {student.last_name}
                        </span>
                      ))}
                    {assignedStudents.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        +{assignedStudents.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  <h3 className="font-medium text-green-800">Submissions</h3>
                </div>
                <p className="text-3xl font-bold text-green-900 mt-2">{submissionCount}</p>
                <p className="text-sm text-green-700">
                  {studentCount > 0
                    ? `${Math.round((submissionCount / studentCount) * 100)}% completion rate`
                    : "No students assigned"}
                </p>
              </div>
            </div>
          </div>



          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6">Student Submissions</h3>
            <SubmissionsList assignmentId={assignmentId} dueDate={assignment.due_date} />
          </div>
        </div>
      </main>

      {assignment && (
        <DeleteAssignmentModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          assignmentTitle={
            assignment.title ||
            (assignment.surah_name && assignment.start_ayah && assignment.end_ayah
              ? generateAssignmentTitle(assignment.surah_name, assignment.start_ayah, assignment.end_ayah)
              : assignment.surah)
          }
          submissionCount={submissionCount}
          studentCount={studentCount}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
