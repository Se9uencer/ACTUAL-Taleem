"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TaleemLogo } from "@/components/taleem-logo"
import { Bell, ChevronDown, User, LogOut, Settings, Book, Home, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface AcademicHeaderProps {
  user: any
}

export function AcademicHeader({ user }: AcademicHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and primary navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard">
                <TaleemLogo className="h-8 w-auto text-primary" />
              </Link>
            </div>
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive("/dashboard")
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
                }`}
              >
                <Home className="mr-1 h-4 w-4" />
                Dashboard
              </Link>

              <Link
                href="/test-model"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive("/test-model")
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
                }`}
              >
                <span className="mr-1 h-4 w-4">🧪</span>
                Test Model
              </Link>

              {user?.role === "teacher" && (
                <Link
                  href="/classes"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/classes")
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
                  }`}
                >
                  <Book className="mr-1 h-4 w-4" />
                  Classes
                </Link>
              )}

              {user?.role === "student" && (
                <Link
                  href="/assignments"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/assignments")
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
                  }`}
                >
                  <Book className="mr-1 h-4 w-4" />
                  Assignments
                </Link>
              )}

              {user?.role === "parent" && (
                <Link
                  href="/parent-dashboard"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/parent-dashboard")
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
                  }`}
                >
                  <Users className="mr-1 h-4 w-4" />
                  Children
                </Link>
              )}
            </div>
          </div>

          {/* Secondary navigation */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
              </button>

              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                      Signed in as <span className="font-medium">{user?.role}</span>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="mr-3 h-4 w-4 text-muted-foreground" />
                      Your Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-muted-foreground" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
