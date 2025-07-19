"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Calendar, Clock, ArrowLeft, Headphones, BarChart2, FileText, AlertTriangle, ChevronDown, ChevronUp, Star, TrendingUp, Award, Target } from "lucide-react"
import { formatDatePST } from "@/lib/date-utils"
import { RecitationAudioPlayer } from "@/components/recitation-audio-player"
import { useState as useLocalState } from "react"

export default function ParentRecitationFeedbackPage() {
  const [assignment, setAssignment] = useState<any>(null)
  const [recitation, setRecitation] = useState<any>(null)
  const [feedback, setFeedback] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  const params = useParams()
  const router = useRouter()
  const recitationId = params.recitationId as string

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

        const userId = sessionData.session.user.id

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (profileError || !profileData) {
          throw new Error("Failed to load profile")
        }

        // Verify user is a parent
        if (profileData.role !== "parent") {
          router.push("/dashboard")
          return
        }

        setProfile(profileData)

        // Fetch recitation details
        const { data: recitationData, error: recitationError } = await supabase
          .from("recitations")
          .select(`
            id,
            assignment_id,
            student_id,
            submitted_at,
            audio_url,
            is_latest,
            verse_feedback,
            feedback(id, accuracy, notes),
            assignments(
              id, 
              title, 
              surah, 
              surah_name,
              start_ayah, 
              end_ayah, 
              due_date,
              created_at,
              class_id,
              classes(id, name, grade_level)
            )
          `)
          .eq("id", recitationId)
          .single()

        if (recitationError || !recitationData) {
          throw new Error("Recitation not found")
        }

        // Get student profile
        const { data: studentData, error: studentError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", String(recitationData.student_id))
          .single()

        if (studentError || !studentData) {
          throw new Error("Student not found")
        }

        // Verify this parent has access to this student
        const { data: parentChildLink, error: linkError } = await supabase
          .from("parent_child_link")
          .select("*")
          .eq("parent_id", userId)
          .eq("child_id", String(recitationData.student_id))
          .single()

        if (linkError || !parentChildLink) {
          throw new Error("You don't have access to this student's data")
        }

        setStudent(studentData)
        setRecitation(recitationData as any)
        setAssignment(recitationData.assignments as any)
        setFeedback(recitationData.feedback as any)
      } catch (error: any) {
        console.error("Error loading recitation feedback:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    if (recitationId) {
      loadData()
    }
  }, [recitationId, router])

  // Helper function to generate assignment title
  const generateAssignmentTitle = (surahName: string, startAyah: number, endAyah: number) => {
    if (!surahName) return "Assignment"

    const surahNameOnly = surahName.replace(/^\d+\.\s+/, "").split(" (")[0]

    if (startAyah === endAyah) {
      return `${surahNameOnly} - Ayah ${startAyah}`
    }
    return `${surahNameOnly} - Ayahs ${startAyah}-${endAyah}`
  }

  const formatDate = (dateString: string) => {
    return formatDatePST(dateString)
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return "text-success"
    if (accuracy >= 0.7) return "text-info"
    if (accuracy >= 0.5) return "text-warning"
    return "text-destructive"
  }

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 0.9) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>
    if (accuracy >= 0.7) return <Badge variant="default" className="bg-blue-100 text-blue-800">Good</Badge>
    if (accuracy >= 0.5) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Needs Practice</Badge>
    return <Badge variant="destructive">Requires Attention</Badge>
  }

  const getParentGuidance = (accuracy: number) => {
    if (accuracy >= 0.9) {
      return {
        icon: <Award className="h-5 w-5 text-green-600" />,
        message: "Excellent work! Your child is demonstrating strong Quranic recitation skills. Continue encouraging regular practice.",
        tips: ["Praise their achievement", "Encourage them to help siblings", "Consider advancing to more challenging passages"]
      }
    }
    if (accuracy >= 0.7) {
      return {
        icon: <Star className="h-5 w-5 text-blue-600" />,
        message: "Good progress! Your child is developing well. A bit more practice will help improve accuracy.",
        tips: ["Practice together during family time", "Listen to Quranic recitations", "Review specific areas that need improvement"]
      }
    }
    if (accuracy >= 0.5) {
      return {
        icon: <Target className="h-5 w-5 text-yellow-600" />,
        message: "Your child is learning but needs more practice. Consider additional support and encouragement.",
        tips: ["Set up daily practice time", "Use Quran apps with audio", "Consider finding a Quran tutor", "Practice specific verses together"]
      }
    }
    return {
      icon: <TrendingUp className="h-5 w-5 text-red-600" />,
      message: "Your child needs significant support. Please work closely with their teacher and consider extra practice time.",
      tips: ["Meet with the teacher", "Daily guided practice sessions", "Start with shorter verses", "Use repetition and audio aids", "Consider one-on-one tutoring"]
    }
  }

  // Verse feedback UI
  const [showDetails, setShowDetails] = useLocalState(false)
  let verseFeedback = recitation?.verse_feedback
  if (typeof verseFeedback === "string") {
    try { verseFeedback = JSON.parse(verseFeedback) } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
            </div>
          </div>
        </header>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            </div>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Unable to Load</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => router.push("/parent-dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!assignment || !recitation || !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Not Found</h1>
            </div>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recitation Not Found</h2>
            <p className="text-gray-600 mb-6">
              The recitation you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/parent-dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const guidance = feedback ? getParentGuidance(feedback.accuracy) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/parent-dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{student.first_name}'s Recitation Results</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Overview Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-purple-600" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2 text-purple-600">
                    {feedback ? Math.round(feedback.accuracy * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Accuracy Score</div>
                  {feedback && getAccuracyBadge(feedback.accuracy)}
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2 text-gray-800">
                    {assignment.surah_name?.replace(/^\d+\.\s+/, "").split(" (")[0] || assignment.surah}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Ayahs {assignment.start_ayah}-{assignment.end_ayah}
                  </div>
                  <Badge variant="outline">{assignment.classes?.name || 'Class'}</Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2 text-gray-800">
                    {formatDate(recitation.submitted_at)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Submitted</div>
                  <Badge variant="secondary">
                    {new Date(recitation.submitted_at) <= new Date(assignment.due_date) ? "On Time" : "Late"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent Guidance */}
          {guidance && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {guidance.icon}
                  Guidance for Parents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{guidance.message}</p>
                <div>
                  <h4 className="font-semibold mb-2">Suggested actions:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {guidance.tips.map((tip, index) => (
                      <li key={index} className="text-gray-600">{tip}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {assignment.title || generateAssignmentTitle(assignment.surah_name, assignment.start_ayah, assignment.end_ayah)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {assignment.surah_name?.replace(/^\d+\.\s+/, "").split(" (")[0] || assignment.surah}
                      {assignment.start_ayah && assignment.end_ayah && (
                        <>, Ayahs {assignment.start_ayah}-{assignment.end_ayah}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Due Date</h3>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(assignment.due_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Submitted</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDatePST(recitation.submitted_at, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Listen to Recitation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full mr-4">
                  <Headphones className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  {recitation.audio_url && (
                    <RecitationAudioPlayer storagePath={recitation.audio_url} className="w-full" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback */}
          {feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Teacher Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Accuracy Progress Bar */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
                      Accuracy Score
                    </h3>
                    <div className="flex items-center mb-2">
                      <div className="flex-1 mr-4">
                        <Progress value={feedback.accuracy * 100} className="h-4" />
                      </div>
                      <div className={`text-2xl font-bold ${getAccuracyColor(feedback.accuracy)}`}>
                        {Math.round(feedback.accuracy * 100)}%
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {feedback.accuracy >= 0.9
                        ? "Excellent recitation! Your child shows strong mastery of the verses."
                        : feedback.accuracy >= 0.7
                          ? "Good recitation with room for improvement in some areas."
                          : feedback.accuracy >= 0.5
                            ? "Your child is learning but needs more practice with pronunciation."
                            : "Significant practice needed. Consider working with a tutor."}
                    </p>
                  </div>

                  {/* Teacher Notes */}
                  {feedback.notes && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-purple-600" />
                        Teacher's Comments
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                        <p className="text-gray-800">{feedback.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Verse Analysis */}
          {verseFeedback && Array.isArray(verseFeedback) && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
                <CardTitle className="text-xl flex items-center justify-between">
                  <span>Detailed Verse Analysis</span>
                  {showDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
                <p className="text-sm text-gray-600">Click to {showDetails ? 'hide' : 'show'} verse-by-verse breakdown</p>
              </CardHeader>
              {showDetails && (
                <CardContent>
                  <div className="space-y-4">
                    {verseFeedback.map((verse: any, index: number) => (
                      <div key={index} className={`border rounded-lg p-4 ${verse.isMissing ? 'border-red-200 bg-red-50' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">
                            Verse {verse.ayah} 
                            {verse.accuracy !== undefined && (
                              <span className={`ml-2 text-sm ${getAccuracyColor(verse.accuracy)}`}>
                                ({Math.round(verse.accuracy * 100)}%)
                              </span>
                            )}
                          </h4>
                          {verse.isMissing ? (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
                          ) : (
                            verse.accuracy !== undefined && getAccuracyBadge(verse.accuracy)
                          )}
                        </div>
                        
                        {verse.isMissing ? (
                          <div className="bg-red-100 border border-red-200 rounded p-3">
                            <div className="flex items-center text-red-800 mb-2">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              <span className="font-medium">No recitation detected for this verse</span>
                            </div>
                            <p className="text-red-700 text-sm mb-3">
                              Your child did not recite this verse or it could not be detected. Consider practicing this verse together.
                            </p>
                            <div>
                              <h5 className="font-medium text-red-800 mb-1">Expected verse:</h5>
                              <p className="bg-white p-2 rounded text-right border" dir="rtl">{verse.expectedText}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h5 className="font-medium text-gray-700 mb-1">Expected:</h5>
                                <p className="bg-green-50 p-2 rounded text-right" dir="rtl">{verse.expectedText}</p>
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-700 mb-1">What your child recited:</h5>
                                <p className="bg-blue-50 p-2 rounded text-right" dir="rtl">{verse.transcribedText}</p>
                              </div>
                            </div>

                            {verse.differences && verse.differences.length > 0 && (
                              <div className="mt-3">
                                <h5 className="font-medium text-gray-700 mb-2">Areas to practice:</h5>
                                <div className="bg-yellow-50 p-2 rounded">
                                  <ul className="text-sm space-y-1">
                                    {verse.differences.map((diff: any, i: number) => (
                                      <li key={i} className="text-gray-700">
                                        • Word {diff.position}: Expected "{diff.expected}" → Heard "{diff.transcribed}"
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/parent-dashboard")} className="order-2 sm:order-1">
              Back to Dashboard
            </Button>
            <Button
              onClick={() => window.print()}
              variant="secondary"
              className="order-1 sm:order-2"
            >
              Print Report
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
} 