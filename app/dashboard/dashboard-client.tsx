"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDatePST } from "@/lib/date-utils"
import { useAssignmentDeletion } from "@/hooks/use-assignment-deletion"
import { isDebugMode } from "@/lib/debug-utils"
import { DeleteAssignmentModal } from "@/components/ui/delete-assignment-modal"
import { TeacherDashboard } from "./teacher-dashboard"
import { StudentDashboard } from "./student-dashboard"
import { ParentDashboard } from "./parent-dashboard"
import { ClassDeletionBanner } from "@/components/ui/class-deletion-banner"
import type { Assignment } from "@/types"
import type { Tables } from "@/types/supabase"

// Shared shape for a class card (teacher: includes student_count;
// student: may omit it since there is no per-class count query for students)
export interface DashboardClass {
  id: string
  name: string
  grade_level: string
  teacher_id: string
  created_at: string | null
  schools: { name: string } | null
  student_count?: number
}

export interface LateSubmission {
  id: string
  submitted_at: string
  assignment_id: string
  assignments: {
    title: string | null
    due_date: string | null
    teacher_id: string | null
    surah_name: string | null
    start_ayah: number | null
    end_ayah: number | null
  }
  profiles: {
    first_name: string | null
    last_name: string | null
  }
  student: string
  assignment: string
  due_date: string | null
}

interface TeacherData {
  role: "teacher"
  classes: DashboardClass[]
  assignments: Assignment[]
  lateSubmissions: LateSubmission[]
}

export interface StudentStreak {
  current_streak: number | null
  longest_streak: number | null
}

export interface EarnedBadge {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  points: number | null
  awarded_at: string
}

interface StudentData {
  role: "student"
  classes: DashboardClass[]
  assignments: Assignment[]
  completedAssignments: Assignment[]
  streak: StudentStreak | null
  badges: EarnedBadge[]
}

interface ParentData {
  role: "parent"
}

type DashboardData = TeacherData | StudentData | ParentData

interface DashboardClientProps {
  profile: Tables<"profiles">
  data: DashboardData
}

const generateAssignmentTitle = (
  surahName: string,
  startAyah: number,
  endAyah: number
) => `${surahName} ${startAyah}-${endAyah}`

export function DashboardClient({ profile, data }: DashboardClientProps) {
  const router = useRouter()
  const [showLateAlert, setShowLateAlert] = useState(true)
  const [deleteModalData, setDeleteModalData] = useState<{
    isOpen: boolean
    assignment: Assignment | null
  }>({ isOpen: false, assignment: null })
  const { deleteAssignment, isDeleting } = useAssignmentDeletion()

  const handleDeleteClick = (assignment: Assignment) => {
    setDeleteModalData({ isOpen: true, assignment })
  }

  const handleDeleteCancel = () => {
    setDeleteModalData({ isOpen: false, assignment: null })
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalData.assignment) {
      await deleteAssignment(deleteModalData.assignment.id)
      setDeleteModalData({ isOpen: false, assignment: null })
      router.refresh()
    }
  }

  const renderContent = () => {
    switch (data.role) {
      case "teacher":
        return (
          <TeacherDashboard
            profile={profile}
            classes={data.classes}
            assignments={data.assignments}
            handleDeleteAssignment={handleDeleteClick}
            isDeleting={isDeleting}
          />
        )
      case "student":
        return (
          <StudentDashboard
            classes={data.classes}
            assignments={data.assignments}
            completedAssignments={data.completedAssignments}
            streak={data.streak}
            badges={data.badges}
          />
        )
      case "parent":
        return <ParentDashboard />
      default:
        return <p>Welcome! Your dashboard is being set up.</p>
    }
  }

  const lateSubmissions =
    data.role === "teacher" ? data.lateSubmissions : []

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Box */}
        {isDebugMode() && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 text-white p-3 rounded-lg max-w-sm z-50">
            <h4 className="font-bold text-xs mb-2">📊 Dashboard Debug:</h4>
            <div className="text-xs mt-2 opacity-70">
              User: {profile.first_name} | Role: {profile.role}
            </div>
          </div>
        )}

        {/* Late Submissions Alert */}
        {data.role === "teacher" && lateSubmissions.length > 0 && showLateAlert && (
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
                  <span className="font-semibold">{rec.student}</span> submitted{" "}
                  <span className="font-semibold">{rec.assignment}</span> late (submitted{" "}
                  {formatDatePST(rec.submitted_at)}; due{" "}
                  {rec.due_date ? formatDatePST(rec.due_date) : "unknown"})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.first_name ?? "User"}!
          </h1>
          <p className="text-gray-600 mt-2">
            {profile.role === "teacher"
              ? "Here's an overview of your classes and assignments."
              : profile.role === "student"
              ? "Track your progress and upcoming assignments."
              : "Monitor your children's learning progress."}
          </p>
        </div>

        {/* Class Deletion Notifications for Students */}
        {profile.role === "student" && <ClassDeletionBanner />}

        {renderContent()}
      </div>

      {deleteModalData.assignment && (
        <DeleteAssignmentModal
          isOpen={deleteModalData.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          assignmentTitle={
            deleteModalData.assignment.title ??
            (deleteModalData.assignment.surah_name &&
            deleteModalData.assignment.start_ayah != null &&
            deleteModalData.assignment.end_ayah != null
              ? generateAssignmentTitle(
                  deleteModalData.assignment.surah_name,
                  deleteModalData.assignment.start_ayah,
                  deleteModalData.assignment.end_ayah
                )
              : deleteModalData.assignment.surah ?? "")
          }
          submissionCount={0}
          studentCount={0}
          isDeleting={isDeleting}
        />
      )}
    </AuthenticatedLayout>
  )
}
