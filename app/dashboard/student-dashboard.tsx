"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Users, BookOpen, CheckCircle, User, Calendar, Trophy, Flame } from "lucide-react"
import { formatDatePST } from "@/lib/date-utils"
import type { StudentStreak, EarnedBadge } from "./dashboard-client"

// Helper function to generate assignment title
const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
  if (!surahName) return "Assignment"
  const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0]
  if (startAyah === endAyah) {
    return `${surahNameOnly} - Ayah ${startAyah}`
  }
  return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`
}

// ── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({ streak }: { streak: StudentStreak | null }) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1 mb-4">
        Your Streak
      </h2>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-orange-100">
            <Flame className="h-7 w-7 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            {current > 0 ? (
              <>
                <p className="text-2xl font-bold text-orange-500 leading-none">
                  {current} {current === 1 ? "day" : "days"}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">current streak</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-700">No active streak</p>
                <p className="text-sm text-gray-500 mt-0.5">Submit a recitation to start one!</p>
              </>
            )}
          </div>
          {longest > 0 && (
            <div className="flex-shrink-0 text-right">
              <p className="text-lg font-bold text-gray-700">{longest}</p>
              <p className="text-xs text-gray-500">best</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

// ── Badges Section ────────────────────────────────────────────────────────────

function BadgesSection({ badges }: { badges: EarnedBadge[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-primary/20 pb-1 mb-4">
        Badges
      </h2>
      {badges.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge) => (
            <Card key={badge.id} className="border border-gray-200 shadow-sm" title={badge.description ?? badge.name}>
              <CardContent className="p-3 flex items-center gap-2">
                {badge.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={badge.icon_url}
                    alt={badge.name}
                    className="w-8 h-8 object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{badge.name}</p>
                  {badge.points != null && (
                    <p className="text-xs text-gray-500">{badge.points} pts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Trophy className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">Complete assignments to earn badges!</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StudentDashboard({
  classes,
  assignments,
  completedAssignments,
  streak,
  badges,
}: {
  classes: any[]
  assignments: any[]
  completedAssignments: any[]
  streak: StudentStreak | null
  badges: EarnedBadge[]
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

      {/* Right Column - Streak, Assignments, Progress, Badges */}
      <div className="space-y-6">
        {/* Streak */}
        <StreakCard streak={streak} />

        {/* Assignments */}
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

        {/* Progress counts */}
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

        {/* Badges */}
        <BadgesSection badges={badges} />
      </div>
    </div>
  )
}
