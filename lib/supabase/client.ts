import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Legacy function name for backward compatibility
export const createClientComponentClient = createClient

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
