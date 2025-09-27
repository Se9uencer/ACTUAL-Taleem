"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase/client"
import { ClaimChildForm } from "./claim-child-form"
import { ChildrenList } from "./children-list"
import { ChildProgressView } from "./child-progress-view"
import { ChildrenPerformanceOverview } from "./children-performance-overview"
import AuthenticatedLayout from "@/components/authenticated-layout"

export default function ParentDashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimedChildren, setClaimedChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)

  const router = useRouter()

  // Refresh the children list when a new child is claimed
  const refreshChildren = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const client = createClientComponentClient()
        setSupabase(client)

        // Check if user is authenticated
        const { data: sessionData, error: sessionError } = await client.auth.getSession()

        if (sessionError) {
          throw new Error(`Authentication error: ${sessionError.message}`)
        }

        if (!sessionData.session) {
          router.push("/login")
          return
        }

        const userId = sessionData.session.user.id

        // Get user profile
        const { data: profileData, error: profileError } = await client
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (profileError) {
          throw new Error(`Failed to load profile: ${profileError.message}`)
        }

        if (!profileData) {
          throw new Error("Profile not found")
        }

        // Verify user is a parent
        if (profileData.role !== "parent") {
          router.push("/dashboard")
          return
        }

        setProfile(profileData)

        // Fetch claimed children
        await fetchClaimedChildren(client, userId)
      } catch (error: any) {
        console.error("Error loading parent dashboard:", error)
        setError(error.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, refreshTrigger])

  const fetchClaimedChildren = async (client: any, parentId: string) => {
    try {
      // Get child IDs from parent_child_link table
      const { data: linkData, error: linkError } = await client
        .from("parent_child_link")
        .select("child_id")
        .eq("parent_id", parentId)

      if (linkError) {
        throw new Error(`Failed to load child links: ${linkError.message}`)
      }

      if (!linkData || linkData.length === 0) {
        setClaimedChildren([])
        return
      }

      // Get child IDs
      const childIds = linkData.map((link: any) => link.child_id)

      // Fetch child profiles
      const { data: childrenData, error: childrenError } = await client
        .from("profiles")
        .select("*")
        .in("id", childIds)
        .eq("role", "student")

      if (childrenError) {
        throw new Error(`Failed to load children profiles: ${childrenError.message}`)
      }

      // For each child, fetch their classes
      const childrenWithClasses = await Promise.all(
        childrenData.map(async (child: any) => {
          // Get class IDs from class_students table
          const { data: classLinks, error: classLinksError } = await client
            .from("class_students")
            .select("class_id")
            .eq("student_id", child.id)

          if (classLinksError) {
            console.error(`Error fetching classes for child ${child.id}:`, classLinksError)
            return { ...child, classes: [] }
          }

          if (!classLinks || classLinks.length === 0) {
            return { ...child, classes: [] }
          }

          // Get class details
          const classIds = classLinks.map((link: any) => link.class_id)
          const { data: classes, error: classesError } = await client.from("classes").select("*").in("id", classIds)

          if (classesError) {
            console.error(`Error fetching class details for child ${child.id}:`, classesError)
            return { ...child, classes: [] }
          }

          return { ...child, classes: classes || [] }
        }),
      )

      setClaimedChildren(childrenWithClasses)
    } catch (error: any) {
      console.error("Error fetching claimed children:", error)
      setError(error.message)
    }
  }

  const handleViewProgress = (childId: string) => {
    setSelectedChildId(childId)
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null)
                window.location.reload()
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Claim Child Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Link Your Child's Account</h2>
          <ClaimChildForm parentId={profile.id} onSuccess={refreshChildren} />
        </div>

        {/* Performance Overview */}
        {claimedChildren.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
            <ChildrenPerformanceOverview children={claimedChildren} />
          </div>
        )}

        {/* Claimed Children List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Children</h2>
          <ChildrenList
            children={claimedChildren}
            onViewProgress={handleViewProgress}
            selectedChildId={selectedChildId}
          />
        </div>

        {/* Child Progress View */}
        {selectedChildId && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {claimedChildren.find((child) => child.id === selectedChildId)?.first_name}'s Progress
            </h2>
            <ChildProgressView childId={selectedChildId} />
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}