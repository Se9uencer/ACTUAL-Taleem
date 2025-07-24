"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown, Users, X } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { dynamicAccent } from "@/lib/accent-utils"

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface StudentSelectorProps {
  classId: string
  selectedStudentIds: string[]
  onSelectionChange: (studentIds: string[], assignToAll: boolean) => void
  assignToAll: boolean
  disabled?: boolean
}

export function StudentSelector({
  classId,
  selectedStudentIds,
  onSelectionChange,
  assignToAll,
  disabled = false
}: StudentSelectorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (classId) {
      loadStudents()
    }
  }, [classId])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const supabase = createClientComponentClient()

      // Get student IDs in this class
      const { data: classStudents, error: studentsError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)

      if (studentsError) {
        console.error('Error fetching class students:', studentsError)
        setError('Failed to load students')
        return
      }

      if (!classStudents || classStudents.length === 0) {
        setStudents([])
        return
      }

      const studentIds = classStudents.map(cs => cs.student_id)

      // Get full student profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', studentIds)
        .eq('role', 'student')

      if (profilesError) {
        console.error('Error fetching student profiles:', profilesError)
        setError('Failed to load student profiles')
        return
      }

      // Format student data with proper typing
      const studentList = (profiles || []).map(profile => ({
        id: profile.id as string,
        first_name: profile.first_name as string,
        last_name: profile.last_name as string,
        email: profile.email as string
      }))
        .sort((a, b) => {
          // Sort alphabetically by last name, then first name
          const lastNameCompare = a.last_name.localeCompare(b.last_name)
          if (lastNameCompare !== 0) return lastNameCompare
          return a.first_name.localeCompare(b.first_name)
        })

      setStudents(studentList)

      // If assign to all is true and no specific selection, select all students
      if (assignToAll && selectedStudentIds.length === 0) {
        const allStudentIds = studentList.map(s => s.id)
        onSelectionChange(allStudentIds, true)
      }

    } catch (err) {
      console.error('Error loading students:', err)
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    const allStudentIds = students.map(s => s.id)
    onSelectionChange(allStudentIds, true)
    setIsOpen(false)
  }

  const handleStudentToggle = (studentId: string) => {
    let newSelection: string[]
    
    if (selectedStudentIds.includes(studentId)) {
      newSelection = selectedStudentIds.filter(id => id !== studentId)
    } else {
      newSelection = [...selectedStudentIds, studentId]
    }

    // Check if all students are selected
    const allSelected = newSelection.length === students.length && 
                       students.every(s => newSelection.includes(s.id))
    
    onSelectionChange(newSelection, allSelected)
  }

  const handleRemoveStudent = (studentId: string) => {
    const newSelection = selectedStudentIds.filter(id => id !== studentId)
    const allSelected = newSelection.length === students.length && 
                       students.every(s => newSelection.includes(s.id))
    onSelectionChange(newSelection, allSelected)
  }

  const getDisplayText = () => {
    if (assignToAll) {
      return `All Students (${students.length})`
    }
    
    if (selectedStudentIds.length === 0) {
      return "No students selected"
    }
    
    if (selectedStudentIds.length === 1) {
      const student = students.find(s => s.id === selectedStudentIds[0])
      return student ? `${student.first_name} ${student.last_name}` : "1 student"
    }
    
    return `${selectedStudentIds.length} students selected`
  }

  const getSelectedStudents = () => {
    return students.filter(s => selectedStudentIds.includes(s.id))
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Assign to Students
        </label>
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          Loading students...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Assign to Students
        </label>
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Assign to Students
      </label>
      
      {/* Selected students chips */}
      {!assignToAll && selectedStudentIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {getSelectedStudents().map(student => (
            <div
              key={student.id}
              className={`inline-flex items-center gap-1 px-2 py-1 ${dynamicAccent.badge.primary} rounded-md text-sm`}
            >
              <span>{student.first_name} {student.last_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveStudent(student.id)}
                className={dynamicAccent.link.primary}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none ${dynamicAccent.input.focus} disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-between`}
        >
          <div className="flex items-center">
            <Users className="h-4 w-4 text-gray-400 mr-2" />
            <span className={selectedStudentIds.length === 0 && !assignToAll ? "text-gray-500" : "text-gray-900"}>
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              {/* All Students option */}
              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between hover:bg-gray-100 ${
                  assignToAll ? `${dynamicAccent.badge.primary} font-medium` : "text-gray-700"
                }`}
              >
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  All Students ({students.length})
                </span>
                {assignToAll && <Check className="h-4 w-4" />}
              </button>
              
              <div className="border-t border-gray-100 my-2" />
              
              {/* Individual students */}
              {students.map(student => {
                const isSelected = selectedStudentIds.includes(student.id)
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleStudentToggle(student.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between hover:bg-gray-100 ${
                      isSelected && !assignToAll ? dynamicAccent.badge.primary : "text-gray-700"
                    }`}
                  >
                    <span>{student.first_name} {student.last_name}</span>
                    {isSelected && !assignToAll && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
              
              {students.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No students in this class
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        {assignToAll 
          ? "Assignment will be assigned to all current students in the class (snapshot)"
          : selectedStudentIds.length === 0
          ? "Please select at least one student"
          : `Assignment will only be assigned to the ${selectedStudentIds.length} selected student${selectedStudentIds.length === 1 ? '' : 's'}`
        }
      </p>
    </div>
  )
} 