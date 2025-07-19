"use client"

import "../auth-styles.css"
import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { createClientComponentClient } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { Card, CardContent } from "@/components/ui/card"
import { AuthApiError } from "@supabase/supabase-js"


export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [role, setRole] = useState("student")
  const [grade, setGrade] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()



  // Generate a unique student ID
  const generateStudentId = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
    let code = "TLM-"

    // First segment (3 chars)
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }  

    code += "-"

    // Second segment (3 chars)
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return code
  }

  const createProfileDirectly = async (supabase: any, userId: string, userData: any) => {
    try {
      // Generate student ID if role is student
      const studentId = userData.role === "student" ? generateStudentId() : null

      // First try to create the profile
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email: userData.email.toLowerCase().trim(),
        first_name: userData.firstName || "",
        last_name: userData.lastName || "",
        role: userData.role,
        grade: userData.grade || null,
        parent_email: userData.parentEmail || null,
        parent_phone: userData.parentPhone || null,
        student_id: studentId,
        created_at: new Date().toISOString(),
        school_id: null, // Explicitly set to null
      })

      if (insertError) {
        return false
      }

      return true
    } catch (error: any) {
      return false
    }
  }

  const verifyProfileExists = async (supabase: any, userId: string, userData: any) => {
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      return false
    }

    if (!profile) {
      return await createProfileDirectly(supabase, userId, userData)
    }

    // Profile exists, check if role is correct
    if (profile.role !== userData.role) {
      const { error: updateError } = await supabase.from("profiles").update({ role: userData.role }).eq("id", userId)

      if (updateError) {
        return false
      }
    }

    // Check if student_id exists for student role
    if (userData.role === "student" && !profile.student_id) {
      const studentId = generateStudentId()
      const { error: updateError } = await supabase.from("profiles").update({ student_id: studentId }).eq("id", userId)

      if (updateError) {
        // Continue anyway
      }
    }

    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !firstName || !lastName) {
      setError("Please fill out all required fields.")
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClientComponentClient()
    const normalizedEmail = email.toLowerCase().trim()

    try {
      // Step 1: Sign up the new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role,
            grade: role === "student" ? grade : undefined,
            parent_email: role === "student" ? parentEmail : undefined,
            parent_phone: role === "student" ? parentPhone : undefined,
          },
        },
      })

      if (signUpError) {
        // Handle specific errors, like a user already existing
        if (signUpError instanceof AuthApiError && signUpError.message.includes("User already registered")) {
          setError("This email is already registered. Please try logging in.")
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (!signUpData.user) {
        setError("Signup was not successful. Please try again.")
        return
      }

      // Step 2: After successful signup, immediately sign in the user
      // The `handle_new_user` trigger in the DB will create the profile automatically.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        // If sign-in fails, redirect to login with a success message
        router.push("/login?message=Account created! Please sign in to continue.")
        return
      }

      // Step 3: Redirect to the dashboard on successful sign-in
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Unexpected Signup Error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground auth-page"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <TaleemLogo className="h-12 w-auto mx-auto text-purple-600" />
        <h2 className="mt-6 text-center text-3xl font-extrabold">Create your account</h2>
        <p className="mt-2 text-center text-sm">
          Or{" "}
          <Link href="/login" className="font-medium">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow sm:rounded-lg">
            <CardContent className="py-8 px-4 sm:px-10">
                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                    <p>{error}</p>
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSignup}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium">
                        First Name
                        </label>
                        <div className="mt-1">
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ahmed"
                            className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium">
                        Last Name
                        </label>
                        <div className="mt-1">
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Khan"
                            className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                        </div>
                    </div>
                    </div>

                    <div>
                    <label htmlFor="email" className="block text-sm font-medium">
                        Email address
                    </label>
                    <div className="mt-1">
                        <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ahmed.khan@example.com"
                        className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                    </div>
                    </div>

                    <div>
                    <label htmlFor="password" className="block text-sm font-medium">
                        Password
                    </label>
                    <div className="mt-1">
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                    </div>
                    </div>

                    <div>
                    <label htmlFor="role" className="block text-sm font-medium">
                        I am a
                    </label>
                    <div className="mt-1">
                        <select
                        id="role"
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="parent">Parent</option>
                        </select>
                    </div>
                    </div>

                    {role === "student" && (
                    <>
                        <div>
                        <label htmlFor="grade" className="block text-sm font-medium">
                            Grade
                        </label>
                        <div className="mt-1">
                            <select
                            id="grade"
                            name="grade"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                            <option value="">Select Grade</option>
                            <option value="Pre-K">Pre-K</option>
                            <option value="Kindergarten">Kindergarten</option>
                            <option value="1st Grade">1st Grade</option>
                            <option value="2nd Grade">2nd Grade</option>
                            <option value="3rd Grade">3rd Grade</option>
                            <option value="4th Grade">4th Grade</option>
                            <option value="5th Grade">5th Grade</option>
                            <option value="6th Grade">6th Grade</option>
                            <option value="7th Grade">7th Grade</option>
                            <option value="8th Grade">8th Grade</option>
                            <option value="9th Grade">9th Grade</option>
                            <option value="10th Grade">10th Grade</option>
                            <option value="11th Grade">11th Grade</option>
                            <option value="12th Grade">12th Grade</option>
                            <option value="College">College</option>
                            <option value="Adult">Adult</option>
                            </select>
                        </div>
                        </div>

                        <div>
                        <label htmlFor="parentEmail" className="block text-sm font-medium">
                            Parent Email (Optional)
                        </label>
                        <div className="mt-1">
                            <input
                            id="parentEmail"
                            name="parentEmail"
                            type="email"
                            value={parentEmail}
                            onChange={(e) => setParentEmail(e.target.value)}
                            placeholder="parent@example.com"
                            className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            />
                        </div>
                        </div>

                        <div>
                        <label htmlFor="parentPhone" className="block text-sm font-medium">
                            Parent Phone (Optional)
                        </label>
                        <div className="mt-1">
                            <input
                            id="parentPhone"
                            name="parentPhone"
                            type="tel"
                            value={parentPhone}
                            onChange={(e) => setParentPhone(e.target.value)}
                            placeholder="(123) 456-7890"
                            className="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            />
                        </div>
                        </div>
                    </>
                    )}

                    <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Sign up"}
                    </button>
                    </div>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}