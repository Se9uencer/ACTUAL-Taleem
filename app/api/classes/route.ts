import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    let accessToken: string | null = null
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.replace("Bearer ", "").trim()
    } else {
      // Try multiple cookie patterns for fallback
      const cookie = request.headers.get("cookie") || ""
      const patterns = [
        /sb-access-token=([^;]+)/,
        /supabase-auth-token=([^;]+)/,
        /access_token=([^;]+)/
      ]
      
      for (const pattern of patterns) {
        const match = cookie.match(pattern)
        if (match) {
          accessToken = match[1]
          break
        }
      }
    }

    if (!accessToken) {
      console.error('No access token found in request headers or cookies')
      return NextResponse.json({ error: "Unauthorized: No access token provided." }, { status: 401 })
    }

    // Verify user
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 500 });
    }
    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid session." }, { status: 401 })
    }

    const userId = user.id

        // Get user profile to check role using the authenticated client
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can create classes' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, grade_level, description } = body

    // Validate required fields
    if (!name || !grade_level) {
      return NextResponse.json(
        { error: 'Class name and grade level are required' },
        { status: 400 }
      )
    }

    // Generate unique class code
    const generateClassCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
      let code = ""
      
      // Generate 9 characters
      for (let i = 0; i < 9; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      return code
    }

    // Check if class code already exists and generate new one if needed
    let classCode = generateClassCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode)
        .single()

      if (!existingClass) {
        break // Class code is unique
      }

      classCode = generateClassCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique class code. Please try again.' },
        { status: 500 }
      )
    }

    // Create the class
    const classData = {
      name: name.trim(),
      grade_level: grade_level,
      description: description?.trim() || null,
      teacher_id: userId,
      class_code: classCode,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Creating class with data:', classData)
    
    const { data: newClass, error: createError } = await supabase
      .from('classes')
      .insert(classData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating class:', createError)
      console.error('Create error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      return NextResponse.json(
        { error: `Failed to create class: ${createError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      message: `Class "${name}" created successfully`
    })

  } catch (error) {
    console.error('Unexpected error creating class:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
