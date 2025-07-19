"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Users, BookOpen, User } from "lucide-react"

export function ParentDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Parent Dashboard</h2>
        <p className="text-primary-foreground mb-4">
          Welcome to Taleem! As a parent, you can monitor your children's progress, view their assignments, and track
          their Quran recitation journey.
        </p>
        <Link
          href="/parent-dashboard"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Users className="mr-2 h-4 w-4" />
          Go to Parent Dashboard
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b-2 border-primary/20 pb-1 mb-4">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Users className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">View Children</h3>
              <Link
                href="/parent-dashboard"
                className="text-xs font-medium text-primary hover:text-primary/80 mt-2"
              >
                View Dashboard
              </Link>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <BookOpen className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Add Child</h3>
              <Link
                href="/parent-dashboard"
                className="text-xs font-medium text-primary hover:text-primary/80 mt-2"
              >
                Add Child
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
  )
} 