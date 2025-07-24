"use client"

import { useState, useEffect } from "react"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { useSettings } from "@/contexts/settings-context"
import { createClientComponentClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LogOut, User, Mail, Shield, FileText } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { AccentColorSelector } from "@/components/ui/accent-color-selector"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const router = useRouter()

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()

        // Get session
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          router.push("/login")
          return
        }

        // Get user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()

        if (profileData) {
          setUser(profileData)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])



  const handleSignOut = async () => {
    try {
      const supabase = createClientComponentClient()
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Settings</h1>

        <div className="space-y-6">
          {/* Theme & Appearance */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground">Appearance</CardTitle>
              <CardDescription className="text-muted-foreground">Customize your accent color</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Accent Color Selection */}
              <AccentColorSelector />


            </CardContent>
          </Card>

          {/* User Information */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground">User Information</CardTitle>
              <CardDescription className="text-muted-foreground">Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-5 bg-muted rounded w-1/2"></div>
                  <div className="h-5 bg-muted rounded w-1/4"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Role</p>
                      <p className="text-sm text-muted-foreground capitalize">{user?.role || "Unknown"}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Privacy & Legal */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground">Privacy & Legal</CardTitle>
              <CardDescription className="text-muted-foreground">Review our policies and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Privacy Policy</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Last updated: April 15, 2024
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-foreground">
                    <h3 className="text-base font-medium text-foreground">1. Introduction</h3>
                    <p>
                      Welcome to Taleem ("we," "our," or "us"). We are committed to protecting your privacy and personal
                      information. This Privacy Policy explains how we collect, use, disclose, and safeguard your
                      information when you use our platform.
                    </p>

                    {/* Additional privacy policy content omitted for brevity */}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Terms of Use
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Terms of Use</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Last updated: April 15, 2024
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-foreground">
                    <h3 className="text-base font-medium text-foreground">1. Acceptance of Terms</h3>
                    <p>
                      By accessing or using Taleem, you agree to be bound by these Terms of Use and all applicable laws
                      and regulations. If you do not agree with any of these terms, you are prohibited from using or
                      accessing this platform.
                    </p>

                    {/* Additional terms of use content omitted for brevity */}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground">Account</CardTitle>
              <CardDescription className="text-muted-foreground">Manage your account access</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex items-center focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
