"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TaleemLogo } from "@/components/taleem-logo"
import { BookOpen, Calendar, Clock, Users, CheckCircle, ArrowLeft, Trash2, Edit } from "lucide-react"
import { formatDateTimePST, isPastDuePST } from "@/lib/date-utils"
import SubmissionsList from "./submissions-list"
import { useAssignmentDeletion } from "@/hooks/use-assignment-deletion"
import { DeleteAssignmentModal } from "@/components/ui/delete-assignment-modal"
import { generateAssignmentTitle } from "@/lib/quran-data"

export interface ClassStudent {
  id: string
  first_name: string | null
  last_name: string | null
}

export interface AssignmentRow {
  id: string
  title: string | null
  surah: string | null
  surah_name: string | null
  start_ayah: number | null
  end_ayah: number | null
  due_date: string | null
  class_id: string | null
  teacher_id: string | null
}

interface Props {
  assignment: AssignmentRow
  className: string
  submissionCount: number
  studentCount: number
  classStudents: ClassStudent[]
  assignedStudentIds: string[]
}

function displayTitle(a: AssignmentRow): string {
  if (a.title) return a.title
  if (a.surah_name && a.start_ayah != null && a.end_ayah != null)
    return generateAssignmentTitle(a.surah_name, a.start_ayah, a.end_ayah)
  return a.surah ?? "Assignment"
}

export function AssignmentDetailClient({
  assignment,
  className,
  submissionCount,
  studentCount,
  classStudents,
  assignedStudentIds,
}: Props) {
  const router = useRouter()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { deleteAssignment, isDeleting } = useAssignmentDeletion()

  const handleDeleteConfirm = async () => {
    const success = await deleteAssignment(assignment.id)
    if (success) {
      setIsDeleteModalOpen(false)
      router.push(`/classes/${assignment.class_id}`)
    }
  }

  const assignedStudents = classStudents.filter((s) =>
    assignedStudentIds.includes(s.id)
  )

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
            >
              <Edit className="h-5 w-5 mr-1" />
              Edit Assignment
            </Link>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-800 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h2 className="text-2xl font-bold text-foreground">{displayTitle(assignment)}</h2>

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
                <span>
                  Due:{" "}
                  {assignment.due_date ? formatDateTimePST(assignment.due_date) : "—"}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-2 text-purple-500" />
                <span
                  className={
                    assignment.due_date && isPastDuePST(assignment.due_date)
                      ? "text-red-600"
                      : "text-green-600"
                  }
                >
                  {assignment.due_date && isPastDuePST(assignment.due_date)
                    ? "Past Due"
                    : "Active"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned-to card */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  <h3 className="font-medium text-purple-800">Assigned To</h3>
                </div>
                <p className="text-3xl font-bold text-purple-900 mt-2">{studentCount}</p>
                <p className="text-sm text-purple-700">
                  {assignedStudents.length === classStudents.length
                    ? "All students (at creation)"
                    : "Selected students"}
                </p>
                {assignedStudents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {assignedStudents.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {s.first_name} {s.last_name}
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

              {/* Submissions card */}
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
            <SubmissionsList
              assignmentId={assignment.id}
              dueDate={assignment.due_date ?? ""}
            />
          </div>
        </div>
      </main>

      <DeleteAssignmentModal
        isOpen={isDeleteModalOpen}
        onClose={() => { if (!isDeleting) setIsDeleteModalOpen(false) }}
        onConfirm={handleDeleteConfirm}
        assignmentTitle={displayTitle(assignment)}
        submissionCount={submissionCount}
        studentCount={studentCount}
        isDeleting={isDeleting}
      />
    </div>
  )
}
