"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Award, Clock, BookOpen, Calendar, Target, AlertTriangle } from "lucide-react"
import { dynamicAccent } from "@/lib/accent-utils"

interface ChildPerformance {
  id: string
  name: string
  totalAssignments: number
  completedAssignments: number
  averageAccuracy: number
  onTimeSubmissions: number
  recentTrend: 'improving' | 'declining' | 'stable'
  lastSubmissionDate: string | null
  needsAttention: boolean
}

interface ChildrenPerformanceOverviewProps {
  children: any[]
}

export function ChildrenPerformanceOverview({ children }: ChildrenPerformanceOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceData, setPerformanceData] = useState<ChildPerformance[]>([])

  useEffect(() => {
    async function fetchPerformanceData() {
      if (!children || children.length === 0) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const supabase = createClientComponentClient()
        const childPerformances: ChildPerformance[] = []

        for (const child of children) {
          // Get all assignments for this child
          const { data: assignmentStudents, error: assignmentError } = await supabase
            .from("assignment_students")
            .select("assignment_id")
            .eq("student_id", child.id)

          if (assignmentError) throw assignmentError

          const assignmentIds = assignmentStudents?.map(as => as.assignment_id) || []

          // Get assignment details
          const { data: assignments, error: assignmentsError } = await supabase
            .from("assignments")
            .select("id, due_date")
            .in("id", assignmentIds)

          if (assignmentsError) throw assignmentsError

          // Get all recitations for this child
          const { data: recitations, error: recitationsError } = await supabase
            .from("recitations")
            .select(`
              id,
              assignment_id,
              submitted_at,
              is_latest
            `)
            .eq("student_id", child.id)
            .eq("is_latest", true)

          if (recitationsError) throw recitationsError

          // Get feedback for these recitations separately
          const recitationIds = recitations?.map(r => r.id) || []
          const { data: feedbackData } = await supabase
            .from("feedback")
            .select("recitation_id, accuracy")
            .in("recitation_id", recitationIds)

          if (recitationsError) throw recitationsError

          // Calculate performance metrics
          const totalAssignments = assignments?.length || 0
          const completedAssignments = recitations?.length || 0
          
          // Calculate average accuracy from feedback data
          const feedbackMap = new Map()
          feedbackData?.forEach(f => feedbackMap.set(f.recitation_id, f.accuracy))
          
          const recitationsWithFeedback = recitations?.filter(r => feedbackMap.has(r.id)) || []
          const averageAccuracy = recitationsWithFeedback.length > 0
            ? recitationsWithFeedback.reduce((sum, r) => sum + feedbackMap.get(r.id), 0) / recitationsWithFeedback.length
            : 0

          // Calculate on-time submissions
          let onTimeSubmissions = 0
          if (recitations && assignments) {
            for (const recitation of recitations) {
              const assignment = assignments.find(a => a.id === recitation.assignment_id)
              if (assignment && new Date(recitation.submitted_at as string) <= new Date(assignment.due_date as string)) {
                onTimeSubmissions++
              }
            }
          }

          // Calculate recent trend (last 3 submissions)
          const recentRecitations = recitationsWithFeedback
            .sort((a, b) => new Date(b.submitted_at as string).getTime() - new Date(a.submitted_at as string).getTime())
            .slice(0, 3)

          let recentTrend: 'improving' | 'declining' | 'stable' = 'stable'
          if (recentRecitations.length >= 2) {
            const latest = feedbackMap.get(recentRecitations[0].id)
            const previous = feedbackMap.get(recentRecitations[recentRecitations.length - 1].id)
            const difference = latest - previous
            
            if (difference > 0.1) recentTrend = 'improving'
            else if (difference < -0.1) recentTrend = 'declining'
          }

          // Determine if needs attention
          const completionRate = totalAssignments > 0 ? completedAssignments / totalAssignments : 1
          const needsAttention = averageAccuracy < 0.7 || completionRate < 0.8 || recentTrend === 'declining'

          // Get last submission date
          const lastSubmissionDate = recitations && recitations.length > 0
            ? recitations.sort((a, b) => new Date(b.submitted_at as string).getTime() - new Date(a.submitted_at as string).getTime())[0].submitted_at as string
            : null

          childPerformances.push({
            id: child.id,
            name: `${child.first_name} ${child.last_name}`.trim() || child.email,
            totalAssignments,
            completedAssignments,
            averageAccuracy,
            onTimeSubmissions,
            recentTrend,
            lastSubmissionDate,
            needsAttention
          })
        }

        setPerformanceData(childPerformances)
      } catch (err: any) {
        console.error("Error fetching performance data:", err)
        setError(err.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()
  }, [children])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Target className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Badge variant="default" className="bg-green-100 text-green-800">Improving</Badge>
      case 'declining':
        return <Badge variant="destructive">Needs Support</Badge>
      default:
        return <Badge variant="secondary">Steady</Badge>
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return "text-green-600"
    if (accuracy >= 0.7) return "text-blue-600"
    if (accuracy >= 0.5) return "text-yellow-600"
    return "text-red-600"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className={`w-8 h-8 ${dynamicAccent.spinner.ring} rounded-full animate-spin`}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <h3 className="font-medium mb-2">Error loading performance data</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (performanceData.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No performance data available yet.</p>
        <p className="text-sm text-gray-400 mt-1">Data will appear once your children submit assignments.</p>
      </div>
    )
  }

  // Calculate overall statistics
  const totalChildren = performanceData.length
  const childrenNeedingAttention = performanceData.filter(child => child.needsAttention).length
  const averageCompletionRate = performanceData.reduce((sum, child) => {
    const rate = child.totalAssignments > 0 ? child.completedAssignments / child.totalAssignments : 0
    return sum + rate
  }, 0) / totalChildren
  const overallAverageAccuracy = performanceData.reduce((sum, child) => sum + child.averageAccuracy, 0) / totalChildren

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className={`bg-gradient-to-r from-[var(--accent-light)] to-blue-50 border-[var(--accent-medium)]`}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className={`h-6 w-6 ${dynamicAccent.icon.primary}`} />
            Family Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${dynamicAccent.icon.primary}`}>
                {Math.round(averageCompletionRate * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Completion</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${getAccuracyColor(overallAverageAccuracy)}`}>
                {Math.round(overallAverageAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Accuracy</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${childrenNeedingAttention > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {childrenNeedingAttention}
              </div>
              <div className="text-sm text-gray-600">Need Attention</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Child Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performanceData.map((child) => (
          <Card key={child.id} className={`${child.needsAttention ? 'border-orange-200 bg-orange-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{child.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {child.needsAttention && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                  {getTrendBadge(child.recentTrend)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Completion Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Assignment Completion</span>
                    <span className="text-sm text-gray-600">
                      {child.completedAssignments}/{child.totalAssignments}
                    </span>
                  </div>
                  <Progress 
                    value={child.totalAssignments > 0 ? (child.completedAssignments / child.totalAssignments) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                {/* Accuracy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Average Accuracy</span>
                    <span className={`text-sm font-semibold ${getAccuracyColor(child.averageAccuracy)}`}>
                      {Math.round(child.averageAccuracy * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={child.averageAccuracy * 100} 
                    className="h-2"
                  />
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${dynamicAccent.icon.primary}`} />
                    <div>
                      <div className="text-xs text-gray-600">On Time</div>
                      <div className="text-sm font-semibold">{child.onTimeSubmissions}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(child.recentTrend)}
                    <div>
                      <div className="text-xs text-gray-600">Trend</div>
                      <div className="text-sm font-semibold capitalize">{child.recentTrend}</div>
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                {child.lastSubmissionDate && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      Last submission: {formatDate(child.lastSubmissionDate)}
                    </span>
                  </div>
                )}

                {/* Attention Message */}
                {child.needsAttention && (
                  <div className="bg-orange-100 border border-orange-200 rounded p-2 mt-3">
                    <p className="text-xs text-orange-800">
                      <strong>Suggestion:</strong> Consider scheduling extra practice time or meeting with their teacher.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 