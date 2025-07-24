"use client"

import { createClient } from "@supabase/supabase-js"
import { supabaseConfig } from "../config"

// Create a singleton instance for client-side usage
let clientInstance: ReturnType<typeof createClient> | null = null

export const createClientComponentClient = () => {
  if (clientInstance) return clientInstance

  // Check if configuration is valid
  if (!supabaseConfig.isValid()) {
    console.error("Invalid Supabase configuration. Check your environment variables.")
    throw new Error("Invalid Supabase configuration")
  }

  try {
    console.log("Creating Supabase client...")

    // Ensure we have values for URL and key
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      throw new Error("Missing Supabase URL or anon key")
    }

    clientInstance = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "taleem-auth-token",
        detectSessionInUrl: true,
      },
    })

    console.log("Supabase client created successfully")
    return clientInstance
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw new Error("Failed to initialize Supabase client. Please check your configuration.")
  }
}

/**
 * Direct authentication bypass - uses raw auth API when client fails
 */
export const directAuthSignIn = async (email: string, password: string) => {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error("Supabase configuration missing")
  }

  try {
    console.log("Attempting direct auth signin...")
    
    const response = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseConfig.anonKey,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseConfig.anonKey}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error_description || errorData.message || 'Authentication failed')
    }

    const data = await response.json()
    
    // Store the session manually
    if (data.access_token) {
      localStorage.setItem('taleem-auth-token', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        user: data.user
      }))
    }

    return { data, error: null }
  } catch (error) {
    console.error("Direct auth signin failed:", error)
    return { data: null, error }
  }
}

/**
 * Direct session check - retrieves stored session from localStorage
 */
export const directGetSession = async () => {
  try {
    const storedSession = localStorage.getItem('taleem-auth-token')
    if (!storedSession) {
      return { data: { session: null }, error: null }
    }

    const sessionData = JSON.parse(storedSession)
    
    // Check if session is expired
    if (Date.now() > sessionData.expires_at) {
      localStorage.removeItem('taleem-auth-token')
      return { data: { session: null }, error: null }
    }

    // Return session in Supabase format
    return {
      data: {
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_at: sessionData.expires_at,
          user: sessionData.user
        }
      },
      error: null
    }
  } catch (error) {
    console.error("Direct session check failed:", error)
    localStorage.removeItem('taleem-auth-token') // Clear corrupted session
    return { data: { session: null }, error }
  }
}

/**
 * Direct user retrieval - gets user from stored session
 */
export const directGetUser = async () => {
  try {
    const sessionResult = await directGetSession()
    if (sessionResult.error || !sessionResult.data.session) {
      return { data: { user: null }, error: sessionResult.error }
    }

    return {
      data: { user: sessionResult.data.session.user },
      error: null
    }
  } catch (error) {
    console.error("Direct user retrieval failed:", error)
    return { data: { user: null }, error }
  }
}

/**
 * Returns the number of students in a class (where profile role is 'student').
 * @param client Supabase client instance
 * @param classId The class ID
 */
export async function getStudentCountForClass(client: any, classId: string): Promise<number> {
  try {
    // First get all class_students for this class
    const { data: classStudents, error: classStudentsError } = await client
      .from('class_students')
      .select('student_id, profiles!inner(role)')
      .eq('class_id', classId)
      .eq('profiles.role', 'student');
    
    if (classStudentsError) {
      console.error('Error fetching class students:', classStudentsError);
      return 0;
    }
    
    return classStudents?.length || 0;
  } catch (error) {
    console.error('Error counting students with role=student:', error);
    return 0;
  }
}

/**
 * Returns the number of students assigned to an assignment (where profile role is 'student').
 * Always uses the assignment_students table for static assignment tracking.
 * @param client Supabase client instance
 * @param assignmentId The assignment ID
 */
export async function getStudentCountForAssignment(client: any, assignmentId: string): Promise<number> {
  try {
    // Count only students explicitly assigned via assignment_students table
    const { data: assignmentStudents, error: assignmentStudentsError } = await client
      .from('assignment_students')
      .select('student_id, profiles!inner(role)')
      .eq('assignment_id', assignmentId)
      .eq('profiles.role', 'student');
    
    if (assignmentStudentsError) {
      console.error('Error fetching assignment students:', assignmentStudentsError);
      return 0;
    }
    
    return assignmentStudents?.length || 0;
  } catch (error) {
    console.error('Error counting assignment students with role=student:', error);
    return 0;
  }
}
