import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/config'

interface Assignment {
  id: string
}

interface ClassStudent {
  student_id: string
  profiles: {
    first_name: string
    last_name: string
  }[]
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params

    // Validate input
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Authentication check (similar to transcribe route)
    let accessToken: string | null = null
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.replace("Bearer ", "").trim()
    } else {
      const cookie = request.headers.get("cookie") || ""
      const match = cookie.match(/sb-access-token=([^;]+)/)
      if (match) accessToken = match[1]
    }

    if (!accessToken) {
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

    // Get service role client for admin operations
    const serviceSupabase = await createServiceRoleClient()

    // Get user profile to check role
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can delete classes' },
        { status: 403 }
      )
    }

    // Get class details and verify ownership
    const { data: classData, error: classError } = await serviceSupabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', classId)
      .single()

    if (classError) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (classData.teacher_id !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own classes' },
        { status: 403 }
      )
    }

    // Get all students in this class before deletion
    const { data: classStudents, error: studentsError } = await serviceSupabase
      .from('class_students')
      .select('student_id, profiles(first_name, last_name)')
      .eq('class_id', classId)

    if (studentsError) {
      console.error('Error fetching class students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch class students' },
        { status: 500 }
      )
    }

    // Begin deletion process in transaction-like manner
    // 1. Delete assignments and their related data
    const { data: assignments, error: assignmentsError } = await serviceSupabase
      .from('assignments')
      .select('id')
      .eq('class_id', classId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments for deletion' },
        { status: 500 }
      )
    }

    // Delete assignment-related data if there are assignments
    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map((a: Assignment) => a.id)

      // Get recitation IDs first for feedback deletion
      const { data: recitations, error: recitationsQueryError } = await serviceSupabase
        .from('recitations')
        .select('id')
        .in('assignment_id', assignmentIds)

      if (recitationsQueryError) {
        console.error('Error fetching recitations:', recitationsQueryError)
      }

      // Delete feedback for recitations
      if (recitations && recitations.length > 0) {
        const recitationIds = recitations.map((r: { id: string }) => r.id)
        const { error: feedbackError } = await serviceSupabase
          .from('feedback')
          .delete()
          .in('recitation_id', recitationIds)
      }

      // Delete recitations
      const { error: recitationsError } = await serviceSupabase
        .from('recitations')
        .delete()
        .in('assignment_id', assignmentIds)

      // Delete assignment_students links
      const { error: assignmentStudentsError } = await serviceSupabase
        .from('assignment_students')
        .delete()
        .in('assignment_id', assignmentIds)

      // Delete assignments
      const { error: deleteAssignmentsError } = await serviceSupabase
        .from('assignments')
        .delete()
        .eq('class_id', classId)

      if (deleteAssignmentsError) {
        console.error('Error deleting assignments:', deleteAssignmentsError)
        return NextResponse.json(
          { error: 'Failed to delete class assignments' },
          { status: 500 }
        )
      }
    }

    // 2. Create deletion logs for each student
    if (classStudents && classStudents.length > 0) {
      const deletionLogs = classStudents.map((student: ClassStudent) => ({
        class_name: classData.name,
        deleted_by: userId,
        student_id: student.student_id,
        message: `The class '${classData.name}' was deleted by your teacher.`,
        dismissed: false
      }))

      const { error: logsError } = await serviceSupabase
        .from('class_deletion_logs')
        .insert(deletionLogs)

      if (logsError) {
        console.error('Error creating deletion logs:', logsError)
        // Continue with deletion even if logging fails
      }
    }

    // 3. Delete class_students relationships
    const { error: classStudentsError } = await serviceSupabase
      .from('class_students')
      .delete()
      .eq('class_id', classId)

    if (classStudentsError) {
      console.error('Error deleting class students:', classStudentsError)
      return NextResponse.json(
        { error: 'Failed to remove students from class' },
        { status: 500 }
      )
    }

    // 4. Finally delete the class itself
    const { error: deleteClassError } = await serviceSupabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (deleteClassError) {
      console.error('Error deleting class:', deleteClassError)
      return NextResponse.json(
        { error: 'Failed to delete class' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Class "${classData.name}" deleted successfully`,
      studentsNotified: classStudents?.length || 0
    })

  } catch (error) {
    console.error('Unexpected error deleting class:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 