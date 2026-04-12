"use client"

import { useState, useEffect } from "react"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { useSettings } from "@/contexts/settings-context"
import { createClientComponentClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LogOut, User, Mail, Shield, FileText } from "lucide-react"
import { toast } from "sonner"
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
      toast.error("Error signing out", { description: "There was a problem signing out. Please try again." })
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/dashboard" label="Back to Dashboard" className="mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

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
                      Last updated: December 15, 2024
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-foreground">
                    <p className="text-muted-foreground">Effective Date: December 15, 2024</p>
                    
                    <p>
                      Taleem ("we," "our," "us") respects your privacy. This Privacy Policy explains what data we collect, how we use it, and the choices you have.
                    </p>

                    <h3 className="text-base font-medium text-foreground">1. Information We Collect</h3>
                    <p>When you use Taleem, we may collect:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Name and email address (for account creation)</li>
                      <li>Username and password (stored securely)</li>
                      <li>Audio recordings you upload (Quran recitations)</li>
                      <li>Assignment progress and analytics (to track learning)</li>
                    </ul>

                    <h3 className="text-base font-medium text-foreground">2. How We Use Your Information</h3>
                    <p>We use this information only to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Provide and improve Taleem's educational services</li>
                      <li>Enable dashboards for teachers, parents, and students</li>
                      <li>Deliver AI-powered feedback on recitations</li>
                    </ul>
                    <p>We do not sell or share your data with advertisers or third parties.</p>

                    <h3 className="text-base font-medium text-foreground">3. Third-Party Services</h3>
                    <p>We use trusted third-party services to operate Taleem, including:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Supabase for hosting and authentication</li>
                      <li>OpenAI APIs for generating AI feedback</li>
                    </ul>
                    <p>These providers may process your data to deliver services but do not use it for their own purposes.</p>

                    <h3 className="text-base font-medium text-foreground">4. Children's Privacy</h3>
                    <p>
                      Because Taleem is used by minors, parental or school consent is required for students under 13 in the United States. 
                      We comply with the Children's Online Privacy Protection Act (COPPA).
                    </p>

                    <h3 className="text-base font-medium text-foreground">5. Data Retention and Deletion</h3>
                    <p>We retain your data as long as your account is active.</p>
                    <p>
                      You or your parent/guardian may request account deletion and removal of personal data at any time by contacting us at: 
                      <a href="mailto:privacy@taleem.app" className="text-primary hover:underline ml-1">privacy@taleem.app</a>.
                    </p>
                    <p>Once we confirm your request, we will delete your account and associated data within a reasonable timeframe.</p>

                    <h3 className="text-base font-medium text-foreground">6. Security</h3>
                    <p>
                      We take reasonable measures to protect your information. However, no system is 100% secure, and we cannot guarantee 
                      absolute protection of your data.
                    </p>

                    <h3 className="text-base font-medium text-foreground">7. Updates to This Policy</h3>
                    <p>
                      We may update this Privacy Policy as our services evolve. If changes are made, we will post the updated version 
                      here with a new effective date.
                    </p>

                    <h3 className="text-base font-medium text-foreground">8. Contact Us</h3>
                    <p>
                      For questions about this Privacy Policy or your data, please contact us at: 
                      <a href="mailto:privacy@taleem.app" className="text-primary hover:underline ml-1">privacy@taleem.app</a>
                    </p>
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
                      Last updated: December 15, 2024
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-foreground">
                    <p className="text-muted-foreground">Effective Date: December 15, 2024</p>
                    
                    <p>
                      Welcome to Taleem ("we," "our," "us"). Taleem is an educational platform designed for Islamic schools, 
                      Sunday schools, parents, teachers, and students to manage Quran recitation assignments and receive 
                      AI-powered feedback. By creating an account or using Taleem, you agree to the following Terms of Use.
                    </p>

                    <h3 className="text-base font-medium text-foreground">1. Eligibility and Accounts</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Taleem may be used by students, parents, and teachers.</li>
                      <li>Students who are minors must have parental or school consent to use Taleem.</li>
                      <li>Users must register with a username, password, and valid email address. You are responsible for keeping your login details secure.</li>
                    </ul>

                    <h3 className="text-base font-medium text-foreground">2. Educational Purpose</h3>
                    <p>
                      Taleem is for educational use only. It is not a substitute for religious authority, professional teaching, or personal judgment.
                    </p>

                    <h3 className="text-base font-medium text-foreground">3. User Content</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Users may upload audio recordings of Quran recitations.</li>
                      <li>By uploading, you grant Taleem a limited license to store, process, and display these recordings for educational use within the platform.</li>
                      <li>You must not upload content that is unlawful, harmful, or outside the scope of Taleem's purpose.</li>
                    </ul>

                    <h3 className="text-base font-medium text-foreground">4. AI Feedback Disclaimer</h3>
                    <p>
                      Taleem uses AI technologies (including OpenAI APIs) to provide automated feedback. This feedback may be inaccurate or incomplete. 
                      It is provided for educational purposes only and should not be treated as final religious or professional guidance.
                    </p>

                    <h3 className="text-base font-medium text-foreground">5. Privacy and Data</h3>
                    <p>
                      Your use of Taleem is also governed by our Privacy Policy above, which explains how we collect, use, and protect your information.
                    </p>

                    <h3 className="text-base font-medium text-foreground">6. Limitation of Liability</h3>
                    <p>
                      Taleem is provided "as is." We do not guarantee uninterrupted service, error-free feedback, or accuracy of AI outputs. 
                      To the maximum extent permitted by law, Taleem and its creators are not liable for any damages arising from your use of the platform.
                    </p>

                    <h3 className="text-base font-medium text-foreground">7. Modifications</h3>
                    <p>
                      We may update these Terms from time to time. If we make changes, we will post the updated version on our site and update the effective date. 
                      Continued use of Taleem after changes means you accept the new Terms.
                    </p>

                    <h3 className="text-base font-medium text-foreground">8. Governing Law</h3>
                    <p>These Terms are governed by the laws of Washington State, United States.</p>
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
