"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"
import { createClientComponentClient } from "@/lib/supabase/client"
import { supabaseConfig } from "@/lib/config"
import { surahData, getAyahCount, generateAssignmentTitle } from "@/lib/quran-data"
// Import the date utility functions
import { getTomorrowDatePST } from "@/lib/date-utils"
import { TimePicker } from "@/components/ui/time-picker"
import { StudentSelector } from "@/components/ui/student-selector"

// Helper function to get all students in a class
const getAllClassStudents = async (supabase: any, classId: string): Promise<string[]> => {
  const { data: classStudents, error } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId)

  if (error) {
    console.error('Error fetching class students:', error)
    return []
  }

  return classStudents?.map((cs: any) => cs.student_id) || []
}

export default function NewAssignmentPage() {
  const [surahName, setSurahName] = useState(surahData[0].name)
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(surahData[0].ayahs)
  const [maxAyah, setMaxAyah] = useState(surahData[0].ayahs)
  const [dueDate, setDueDate] = useState(() => {
    // Set default due date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  })
  const [dueTime, setDueTime] = useState("") // No default time
  const [classId, setClassId] = useState("")
  const [classes, setClasses] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignToAll, setAssignToAll] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClassId = searchParams.get("class")

  useEffect(() => {
    if (preselectedClassId) {
      setClassId(preselectedClassId)
    }
  }, [preselectedClassId])

  // Update max ayah when surah changes
  useEffect(() => {
    const ayahCount = getAyahCount(surahName)
    setMaxAyah(ayahCount)

    // Reset start and end ayah when surah changes
    setStartAyah(1)
    setEndAyah(Math.min(5, ayahCount)) // Default to first 5 ayahs or less if surah is shorter
  }, [surahName])

  useEffect(() => {
    const client = createClientComponentClient()
    const loadData = async () => {
        try {
          const { data: sessionData } = await client.auth.getSession()
          if (!sessionData.session) {
            router.push("/login");
            return
          }
          const userId = sessionData.session.user.id
          const { data: profileData } = await client.from("profiles").select("*").eq("id", userId).single()
          setProfile(profileData)
          if (profileData && profileData.role !== "teacher") {
            router.push("/dashboard");
            return
          }
          const { data: allClasses } = await client.from("classes").select("*").order("created_at", { ascending: false })
          const teacherClasses = allClasses?.filter((c) => c.teacher_id === userId) || []
          setClasses(teacherClasses)
          if (preselectedClassId) {
            setClassId(preselectedClassId)
          } else if (teacherClasses.length === 1) {
            setClassId(String(teacherClasses[0].id))
          }
        } catch (e: any) {
          setError(e.message)
        } finally {
            setLoading(false)
        }
    }
    loadData()
  }, [router, preselectedClassId])

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSurahName(e.target.value)
    const newMax = getAyahCount(e.target.value)
    setMaxAyah(newMax)
    setStartAyah(1)
    setEndAyah(Math.min(5, newMax))
  }

  const handleStudentSelectionChange = (studentIds: string[], assignToAll: boolean) => {
    setSelectedStudentIds(studentIds)
    setAssignToAll(assignToAll)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId) {
      setError("Please select a class.");
      return
    }
    if (!dueTime) {
      setError("Please select a due time.");
      return
    }
    if (!assignToAll && selectedStudentIds.length === 0) {
      setError("Please select at least one student or choose 'All Students'.");
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClientComponentClient()
      const title = generateAssignmentTitle(surahName, startAyah, endAyah)
      
      // Create a proper Pacific timezone timestamp
      // Dynamically determine Pacific timezone offset (PDT vs PST)
      const testDate = new Date(`${dueDate}T${dueTime}:00`)
      const pacificOffset = testDate.getTimezoneOffset() === 420 ? '-07:00' : '-08:00'
      const dueDateTime = `${dueDate}T${dueTime}:00${pacificOffset}`
      

      
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          teacher_id: profile.id,
          class_id: classId,
          title,
          surah_name: surahName,
          start_ayah: startAyah,
          end_ayah: endAyah,
          due_date: dueDateTime,
        })
        .select()
        .single()

      if (assignmentError) throw new Error(assignmentError.message)

      // Always create assignment-student relationships (snapshot behavior)
      const studentsToAssign = assignToAll ? 
        // If "All Students" selected, snapshot current students in the class
        await getAllClassStudents(supabase, classId) : 
        // Otherwise use specifically selected students
        selectedStudentIds

      if (studentsToAssign.length > 0) {
        const assignmentStudentData = studentsToAssign.map((studentId: string) => ({
          assignment_id: assignment.id,
          student_id: studentId,
        }))

        const { error: assignmentStudentsError } = await supabase
          .from("assignment_students")
          .insert(assignmentStudentData)

        if (assignmentStudentsError) {
          console.error("Error creating student assignments:", assignmentStudentsError)
          throw new Error("Failed to assign students to assignment")
        }
      } else {
        throw new Error("No students available to assign")
      }

      router.push(`/assignments/${assignment.id}?message=Assignment created successfully!`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }
  
    if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <TaleemLogo className="h-12 w-auto text-purple-600 mb-4" />
        <p className="text-gray-700 mb-2">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <TaleemLogo className="h-8 w-auto text-purple-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md"><p>{error}</p></div>}

            <div className="space-y-4">
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700">Class</label>
                <select id="class" value={classId} onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (<option key={classItem.id} value={classItem.id}>{classItem.name}</option>))}
                </select>
              </div>

              <div>
                <label htmlFor="surah" className="block text-sm font-medium text-gray-700">Surah</label>
                <select id="surah" value={surahName} onChange={handleSurahChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required >
                  {surahData.map((surah) => (<option key={surah.number} value={surah.name}>{surah.name}</option>))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="startAyah" className="block text-sm font-medium text-gray-700">Start Ayah</label>
                  <input type="number" id="startAyah" value={startAyah} onChange={(e) => setStartAyah(Number(e.target.value))}
                    min={1} max={maxAyah} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                  <label htmlFor="endAyah" className="block text-sm font-medium text-gray-700">End Ayah</label>
                  <input type="number" id="endAyah" value={endAyah} onChange={(e) => setEndAyah(Number(e.target.value))}
                    min={startAyah} max={maxAyah} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input type="date" id="dueDate" value={dueDate} min={getTomorrowDatePST()}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                  <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700">Due Time</label>
                  <div className="mt-1">
                    <TimePicker value={dueTime} onChange={setDueTime} placeholder="Select time" className="h-10" />
                  </div>
                </div>
              </div>

              {/* Student Selection */}
              {classId && (
                <StudentSelector
                  classId={classId}
                  selectedStudentIds={selectedStudentIds}
                  onSelectionChange={handleStudentSelectionChange}
                  assignToAll={assignToAll}
                  disabled={submitting}
                />
              )}
            </div>



            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={submitting || loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50">
                {submitting ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
