"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Users, BookOpen, CheckCircle, User, Calendar } from "lucide-react"
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

export function StudentDashboard({
  classes,
  assignments,
  completedAssignments,
}: {
  classes: any[]
  assignments: any[]
  completedAssignments: any[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Classes & Quick Links */}
      <div className="lg:col-span-2 space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1">
              Enrolled Classes
            </h2>
            <Link href="/join-class" className="text-sm font-medium text-primary hover:text-primary/80">
              Join a Class
            </Link>
          </div>
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.slice(0, 4).map((classItem: any) => (
                <Card key={classItem.id} className="border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{classItem.name}</h3>
                    <p className="text-xs text-gray-500">Grade: {classItem.grade_level}</p>
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {classItem.student_count || 0} {classItem.student_count === 1 ? "Student" : "Students"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">You are not enrolled in any classes yet.</p>
                <Link href="/join-class" className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80">
                  Join a Class
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1 mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">View Assignments</h3>
                <Link href="/assignments" className="text-xs font-medium text-primary hover:text-primary/80 mt-2">
                  View All
                </Link>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Completed Work</h3>
                <Link
                  href="/assignments?tab=completed"
                  className="text-xs font-medium text-primary hover:text-primary/80 mt-2"
                >
                  View Completed
                </Link>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <User className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Update Profile</h3>
                <Link href="/profile" className="text-xs font-medium text-primary hover:text-primary/80 mt-2">
                  Edit Profile
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Right Column - Assignments & Progress */}
      <div className="space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1">
              Your Assignments
            </h2>
            <Link href="/assignments" className="text-sm font-medium text-primary hover:text-primary/80">
              View All
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
                        <Link
                          href={`/recitations/new?assignment=${assignment.id}`}
                          className="text-xs font-medium text-primary hover:text-primary/80"
                        >
                          Submit
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">You don't have any pending assignments.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Your Progress */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1 mb-4">
            Your Progress
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center">
                <BookOpen className="h-6 w-6 text-primary mb-2" />
                <p className="text-2xl font-bold">
                  {assignments.length + completedAssignments.length}
                </p>
                <p className="text-xs text-gray-500">Total Assignments</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center">
                <CheckCircle className="h-6 w-6 text-primary mb-2" />
                <p className="text-2xl font-bold">{completedAssignments.length}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
} 