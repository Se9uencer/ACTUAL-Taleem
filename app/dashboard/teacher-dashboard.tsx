"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, School, Trash2, Calendar } from "lucide-react"
import { formatDatePST } from "@/lib/date-utils"

// Helper function to generate assignment title
const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
  if (!surahName) return "Assignment"
  const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0]
  if (startAyah === endAyah) {
    return `${surahNameOnly} - Ayah ${startAyah}`
  }
  return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`
}

export function TeacherDashboard({
  profile,
  classes,
  assignments,
  handleDeleteAssignment,
  isDeleting,
}: {
  profile: any
  classes: any[]
  assignments: any[]
  handleDeleteAssignment: (id: string, title: string) => void
  isDeleting: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Classes & Quick Links */}
      <div className="lg:col-span-2 space-y-6">
        {/* Your Classes Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20 pb-1">
              Your Classes
            </h2>
            <Link href="/classes" className="text-sm font-medium text-primary hover:text-primary/80">
              Manage Classes
            </Link>
          </div>
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.slice(0, 4).map((classItem: any) => (
                <Card key={classItem.id} className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{classItem.name}</CardTitle>
                    <p className="text-xs text-gray-500">Grade: {classItem.grade_level}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {classItem.student_count || 0} {classItem.student_count === 1 ? "Student" : "Students"}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/classes/${classItem.id}`}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        View Details
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">You haven't created any classes yet.</p>
                <Link href="/classes" className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80">
                  Create Your First Class
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Quick Links Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20 pb-1 mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Manage Students</h3>
                <p className="text-xs text-gray-500 mb-3">View and manage your students</p>
                <Link href="/classes" className="text-xs font-medium text-primary hover:text-primary/80">
                  View Students
                </Link>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Create Assignment</h3>
                <p className="text-xs text-gray-500 mb-3">Assign new work to your students</p>
                <Link href="/assignments/new" className="text-xs font-medium text-primary hover:text-primary/80">
                  Create New
                </Link>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <School className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Create Class</h3>
                <p className="text-xs text-gray-500 mb-3">Set up a new class for your students</p>
                <Link href="/classes" className="text-xs font-medium text-primary hover:text-primary/80">
                  Create Class
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Right Column - Assignments & Activity */}
      <div className="space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20 pb-1">
              Upcoming Assignments
            </h2>
            <Link href="/assignments/new" className="text-sm font-medium text-primary hover:text-primary/80">
              Create New
            </Link>
          </div>

          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, 5).map((assignment: any) => {
                const assignmentTitle =
                  assignment.title ||
                  (assignment.surah_name &&
                  assignment.start_ayah &&
                  assignment.end_ayah
                    ? generateAssignmentTitle(
                        assignment.surah_name,
                        assignment.start_ayah,
                        assignment.end_ayah,
                      )
                    : assignment.surah)

                return (
                  <Card key={assignment.id} className="border border-gray-200 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-sm">{assignmentTitle}</h3>
                          {assignment.class_name && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Class: {assignment.class_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Due {formatDatePST(assignment.due_date, { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {assignment.surah_name
                            ? `${assignment.surah_name.split(" (")[0].replace(/^\d+\.\s+/, "")}`
                            : assignment.surah}
                          {assignment.start_ayah &&
                            assignment.end_ayah &&
                            `, Ayahs ${assignment.start_ayah}-${assignment.end_ayah}`}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/assignments/${assignment.id}`}
                            className="text-xs font-medium text-primary hover:text-primary/80"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id, assignmentTitle)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete assignment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">You haven't created any assignments yet.</p>
                <Link
                  href="/assignments/new"
                  className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80"
                >
                  Create Your First Assignment
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
} 