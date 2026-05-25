"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { BackButton } from "@/components/ui/back-button"
import {
  CopyIcon,
  CheckIcon,
  UsersIcon,
  XIcon,
  UserIcon,
  BookOpenIcon,
  CreditCardIcon as IdCardIcon,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import AssignmentsList from "./assignments-list"
import { DeleteClassModal } from "@/components/ui/delete-class-modal"
import { useClassDeletion } from "@/hooks/use-class-deletion"
import { toast } from "sonner"
import { dynamicAccent } from "@/lib/accent-utils"
import { createClient } from "@/lib/supabase/client"

export interface StudentProfile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  grade: string | null
  parent_email: string | null
  parent_phone: string | null
  student_id: string | null
}

export interface ClassStudentLink {
  student_id: string
  enrollment_status: string | null
  profiles: StudentProfile | null
}

export interface ClassData {
  id: string
  name: string
  grade_level: string
  class_code: string | null
  description: string | null
  teacher_id: string
  schools: { name: string } | null
}

interface StudentAssignment {
  id: string
  title: string | null
  surah_name: string | null
  start_ayah: number | null
  end_ayah: number | null
  due_date: string | null
  submitted: boolean
}

interface ClassDetailsClientProps {
  classData: ClassData
  initialLinks: ClassStudentLink[]
  studentCount: number
  isTeacher: boolean
  userId: string
}

const generateAssignmentTitle = (
  surahName: string,
  startAyah: number,
  endAyah: number
) => {
  const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0]
  if (startAyah === endAyah) return `${surahNameOnly} - Ayah ${startAyah}`
  return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`
}

export function ClassDetailsClient({
  classData,
  initialLinks,
  studentCount,
  isTeacher,
  userId,
}: ClassDetailsClientProps) {
  const router = useRouter()
  const { deleteClass, isDeleting } = useClassDeletion()

  // Mutable student list — supports optimistic removal without a full page reload
  const [classStudentLinks, setClassStudentLinks] =
    useState<ClassStudentLink[]>(initialLinks)

  // UI interaction state
  const [copied, setCopied] = useState(false)
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null)
  const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null)
  const [showStudentProfile, setShowStudentProfile] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // On-demand student assignment data (loaded when teacher opens a profile panel)
  const [studentAssignments, setStudentAssignments] = useState<
    StudentAssignment[]
  >([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  const missingProfiles = classStudentLinks.filter((row) => !row.profiles)

  // ── clipboard helpers ────────────────────────────────────────────────────
  const copyClassCode = () => {
    if (classData.class_code) {
      navigator.clipboard.writeText(classData.class_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyStudentId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedStudentId(id)
    setTimeout(() => setCopiedStudentId(null), 2000)
  }

  // ── student removal ─────────────────────────────────────────────────────
  const handleRemoveStudent = async (studentId: string) => {
    // Optimistic update
    setClassStudentLinks((prev) =>
      prev.filter((row) => row.student_id !== studentId)
    )
    setShowConfirmRemove(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", classData.id)
        .eq("student_id", studentId)

      if (error) throw error
      // Sync server state so a hard refresh shows correct data
      router.refresh()
    } catch (err: any) {
      console.error("Error removing student:", err)
      // Roll back optimistic update
      setClassStudentLinks(initialLinks)
      alert(`Failed to remove student: ${err.message}`)
    }
  }

  // ── class deletion ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    const success = await deleteClass(classData.id, classData.name)
    if (success) {
      setIsDeleteModalOpen(false)
      toast.success(`Class "${classData.name}" deleted successfully`)
      router.push("/classes")
    }
  }

  // ── on-demand assignment fetch (teacher "View Profile" panel) ────────────
  const loadStudentAssignments = async (studentId: string) => {
    setLoadingAssignments(true)
    setStudentAssignments([])

    try {
      const supabase = createClient()

      const { data: assignmentStudents, error: asError } = await supabase
        .from("assignment_students")
        .select("assignment_id")
        .eq("student_id", studentId)

      if (asError || !assignmentStudents?.length) return

      const assignmentIds = assignmentStudents.map((a) => a.assignment_id)

      const [assignmentsResult, recitationsResult] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, title, surah_name, start_ayah, end_ayah, due_date")
          .in("id", assignmentIds)
          .eq("class_id", classData.id)
          .order("due_date", { ascending: false }),
        supabase
          .from("recitations")
          .select("assignment_id")
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds),
      ])

      if (assignmentsResult.error) throw assignmentsResult.error

      const submittedIds = new Set(
        (recitationsResult.data ?? []).map((r) => r.assignment_id)
      )

      setStudentAssignments(
        (assignmentsResult.data ?? []).map((a) => ({
          ...a,
          submitted: submittedIds.has(a.id),
        }))
      )
    } catch (err) {
      console.error("Error loading student assignments:", err)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const handleViewProfile = async (studentId: string) => {
    setShowStudentProfile(studentId)
    await loadStudentAssignments(studentId)
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton href="/classes" label="Back to Classes" className="mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Class Details</h1>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg overflow-hidden">

              {/* ── Header ───────────────────────────────────────────── */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{classData.name}</h2>
                    <p className="text-gray-600 mt-1">Grade: {classData.grade_level}</p>
                    {classData.schools?.name && (
                      <p className="text-gray-600">School: {classData.schools.name}</p>
                    )}
                  </div>
                  {isTeacher && (
                    <div className="flex gap-2">
                      <Link
                        href={`/assignments/new?class=${classData.id}`}
                        className={`${dynamicAccent.button.primary} px-4 py-2 rounded-md text-sm font-medium`}
                      >
                        Create Assignment
                      </Link>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 hover:border-red-400 flex items-center"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Class
                      </button>
                    </div>
                  )}
                </div>
                {classData.description && (
                  <p className="text-gray-700 mt-4">{classData.description}</p>
                )}
              </div>

              {/* ── Class code (teacher only) ─────────────────────────── */}
              {isTeacher && (
                <div className="p-6 bg-gray-50 border-b">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Class Code</h3>
                  <p className="text-gray-600 mb-3">
                    Share this code with students so they can join your class.
                  </p>
                  <div className="flex items-center">
                    <div className="bg-white border border-gray-300 rounded-md px-4 py-2 font-mono text-lg">
                      {classData.class_code}
                    </div>
                    <button
                      onClick={copyClassCode}
                      className="ml-2 p-2 text-gray-500 hover:text-[var(--primary)] focus:outline-none"
                      aria-label="Copy class code"
                    >
                      {copied ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <CopyIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Students list ─────────────────────────────────────── */}
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <UsersIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Students ({studentCount})
                  </h3>
                </div>

                {missingProfiles.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 flex items-center text-yellow-800 rounded">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {missingProfiles.length} student(s) have missing or invalid profiles.
                    Please check your database integrity.
                  </div>
                )}

                {classStudentLinks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classStudentLinks.map((row) => {
                      const profile = row.profiles
                      return (
                        <div
                          key={row.student_id}
                          className="border rounded-lg shadow-sm relative"
                        >
                          {isTeacher && profile && (
                            <button
                              onClick={() => setShowConfirmRemove(profile.id)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                              aria-label="Remove student"
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          )}
                          <div className="p-4">
                            <div className="flex items-center mb-3">
                              <div className={`${dynamicAccent.badge.primary} p-2 rounded-full mr-3`}>
                                <UserIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {profile
                                    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
                                      "Unknown user"
                                    : "Unknown user"}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {profile ? profile.email : row.student_id}
                                </p>
                              </div>
                            </div>

                            {isTeacher && profile?.student_id && (
                              <div className="mb-3 flex items-center">
                                <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono flex-grow">
                                  ID: {profile.student_id}
                                </div>
                                <button
                                  onClick={() => copyStudentId(profile.student_id!)}
                                  className="ml-1 p-1 text-gray-500 hover:text-[var(--primary)] focus:outline-none"
                                  title="Copy student ID"
                                >
                                  {copiedStudentId === profile.student_id ? (
                                    <CheckIcon className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <CopyIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}

                            <div className="mt-4 flex space-x-2">
                              {profile ? (
                                <button
                                  onClick={() => handleViewProfile(profile.id)}
                                  className={`flex-1 text-center px-3 py-1.5 ${dynamicAccent.button.primary} text-sm rounded`}
                                >
                                  View Profile
                                </button>
                              ) : (
                                <span className="flex-1 text-center px-3 py-1.5 bg-gray-200 text-gray-500 text-sm rounded cursor-not-allowed">
                                  No profile
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Remove confirmation */}
                          {profile && showConfirmRemove === profile.id && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                  Remove Student
                                </h3>
                                <p className="text-gray-600 mb-6">
                                  Are you sure you want to remove {profile.first_name}{" "}
                                  {profile.last_name} from this class?
                                </p>
                                <div className="flex justify-end space-x-3">
                                  <button
                                    onClick={() => setShowConfirmRemove(null)}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleRemoveStudent(profile.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Student profile panel */}
                          {profile && showStudentProfile === profile.id && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-xl font-medium text-gray-900">
                                    {profile.first_name} {profile.last_name}&apos;s Profile
                                  </h3>
                                  <button
                                    onClick={() => setShowStudentProfile(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                  >
                                    <XIcon className="h-5 w-5" />
                                  </button>
                                </div>

                                {isTeacher && profile.student_id && (
                                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <IdCardIcon
                                          className={`h-5 w-5 ${dynamicAccent.icon.primary} mr-2`}
                                        />
                                        <h4 className="text-sm font-medium text-gray-700">
                                          Student ID
                                        </h4>
                                      </div>
                                      <div className="flex items-center">
                                        <code
                                          className={`bg-white px-3 py-1 rounded border ${dynamicAccent.icon.primary} font-mono text-sm`}
                                        >
                                          {profile.student_id}
                                        </code>
                                        <button
                                          onClick={() => copyStudentId(profile.student_id!)}
                                          className="ml-1 p-1 text-gray-500 hover:text-[var(--primary)] focus:outline-none"
                                          title="Copy student ID"
                                        >
                                          {copiedStudentId === profile.student_id ? (
                                            <CheckIcon className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <CopyIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      This ID can be shared with parents to link their accounts
                                    </p>
                                  </div>
                                )}

                                <div className="mb-6">
                                  <h4 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                                    <BookOpenIcon
                                      className={`h-5 w-5 mr-2 ${dynamicAccent.icon.primary}`}
                                    />
                                    Assignments
                                  </h4>

                                  {loadingAssignments ? (
                                    <p className="text-gray-500 text-center py-4">
                                      Loading assignments…
                                    </p>
                                  ) : studentAssignments.length > 0 ? (
                                    <div className="space-y-3">
                                      {studentAssignments.map((assignment) => (
                                        <div
                                          key={assignment.id}
                                          className="border rounded-lg p-3"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <h5 className="font-medium">
                                                {assignment.title ??
                                                  (assignment.surah_name &&
                                                  assignment.start_ayah != null &&
                                                  assignment.end_ayah != null
                                                    ? generateAssignmentTitle(
                                                        assignment.surah_name,
                                                        assignment.start_ayah,
                                                        assignment.end_ayah
                                                      )
                                                    : "Assignment")}
                                              </h5>
                                              <p className="text-sm text-gray-600">
                                                Due:{" "}
                                                {assignment.due_date
                                                  ? new Date(
                                                      assignment.due_date
                                                    ).toLocaleDateString()
                                                  : "No due date"}
                                              </p>
                                            </div>
                                            <span
                                              className={`text-sm px-2 py-1 rounded ${
                                                assignment.submitted
                                                  ? "bg-green-100 text-green-800"
                                                  : assignment.due_date &&
                                                    new Date(assignment.due_date) < new Date()
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-yellow-100 text-yellow-800"
                                              }`}
                                            >
                                              {assignment.submitted
                                                ? "Submitted"
                                                : assignment.due_date &&
                                                  new Date(assignment.due_date) < new Date()
                                                ? "Overdue"
                                                : "Pending"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-center py-4">
                                      No assignments found for this student.
                                    </p>
                                  )}
                                </div>

                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setShowStudentProfile(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No students enrolled in this class.</p>
                )}
              </div>

              {/* ── Class assignments (teacher only) ─────────────────── */}
              {isTeacher && (
                <div className="p-6 border-t">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <BookOpenIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Class Assignments
                      </h3>
                    </div>
                    <Link
                      href={`/assignments/new?class=${classData.id}`}
                      className={`${dynamicAccent.button.primary} px-4 py-2 rounded-md text-sm font-medium`}
                    >
                      Create Assignment
                    </Link>
                  </div>
                  <AssignmentsList classId={classData.id} />
                </div>
              )}
            </div>
          </main>

          <DeleteClassModal
            isOpen={isDeleteModalOpen}
            onClose={() => { if (!isDeleting) setIsDeleteModalOpen(false) }}
            onConfirm={handleConfirmDelete}
            className={classData.name}
            studentCount={studentCount}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
