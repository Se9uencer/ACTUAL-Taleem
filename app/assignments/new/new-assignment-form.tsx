"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { BackButton } from "@/components/ui/back-button"
import { surahData, getAyahCount, generateAssignmentTitle } from "@/lib/quran-data"
import { getTomorrowDatePST, pacificWallClockToISO } from "@/lib/date-utils"
import { TimePicker } from "@/components/ui/time-picker"
import { StudentSelector } from "@/components/ui/student-selector"
import { createClient } from "@/lib/supabase/client"

export interface ClassOption {
  id: string
  name: string
}

interface NewAssignmentFormProps {
  userId: string
  classes: ClassOption[]
  preselectedClassId: string | null
}

/** Fetch all active student IDs for a class (used when assigning to everyone). */
async function getAllClassStudents(classId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId)
    .eq("enrollment_status", "active")

  if (error) {
    console.error("Error fetching class students:", error)
    return []
  }
  return data?.map((row) => row.student_id) ?? []
}

export function NewAssignmentForm({
  userId,
  classes,
  preselectedClassId,
}: NewAssignmentFormProps) {
  const router = useRouter()

  // ── Surah selection ──────────────────────────────────────────────────────
  const [surahName, setSurahName] = useState(surahData[0].name)
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(Math.min(5, surahData[0].ayahs))
  const [maxAyah, setMaxAyah] = useState(surahData[0].ayahs)

  // ── Due date / time ──────────────────────────────────────────────────────
  const [dueDate, setDueDate] = useState(getTomorrowDatePST)
  const [dueTime, setDueTime] = useState("")

  // ── Class + student selection ────────────────────────────────────────────
  const [classId, setClassId] = useState(() => {
    if (preselectedClassId) return preselectedClassId
    if (classes.length === 1) return classes[0].id
    return ""
  })
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [assignToAll, setAssignToAll] = useState(true)

  // ── Form state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset ayah bounds when surah changes
  useEffect(() => {
    const ayahCount = getAyahCount(surahName)
    setMaxAyah(ayahCount)
    setStartAyah(1)
    setEndAyah(Math.min(5, ayahCount))
  }, [surahName])

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSurahName(e.target.value)
  }

  const handleStudentSelectionChange = (
    studentIds: string[],
    toAll: boolean
  ) => {
    setSelectedStudentIds(studentIds)
    setAssignToAll(toAll)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!classId) { setError("Please select a class."); return }
    if (!dueTime) { setError("Please select a due time."); return }
    if (!assignToAll && selectedStudentIds.length === 0) {
      setError("Please select at least one student or choose 'All Students'.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const title = generateAssignmentTitle(surahName, startAyah, endAyah)

      // Convert the Pacific wall-clock date+time to a proper ISO timestamp.
      // pacificWallClockToISO uses Intl to find the real LA offset for this
      // date (PDT -07:00 or PST -08:00) regardless of where the browser is.
      const dueDateTime = pacificWallClockToISO(dueDate, dueTime)

      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          teacher_id: userId,
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

      // Snapshot students at assignment-creation time
      const studentsToAssign = assignToAll
        ? await getAllClassStudents(classId)
        : selectedStudentIds

      if (studentsToAssign.length === 0) {
        throw new Error("No students available to assign")
      }

      const { error: linkError } = await supabase
        .from("assignment_students")
        .insert(
          studentsToAssign.map((studentId) => ({
            assignment_id: assignment.id,
            student_id: studentId,
          }))
        )

      if (linkError) throw new Error("Failed to assign students to assignment")

      router.push(
        `/assignments/${assignment.id}?message=Assignment created successfully!`
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const backHref = preselectedClassId
    ? `/classes/${preselectedClassId}`
    : "/classes"

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton href={backHref} label="Back to Classes" className="mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Class */}
                <div>
                  <label
                    htmlFor="class"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Class
                  </label>
                  <select
                    id="class"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Surah */}
                <div>
                  <label
                    htmlFor="surah"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Surah
                  </label>
                  <select
                    id="surah"
                    value={surahName}
                    onChange={handleSurahChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    {surahData.map((surah) => (
                      <option key={surah.number} value={surah.name}>
                        {surah.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ayah range */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="startAyah"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Start Ayah
                    </label>
                    <input
                      type="number"
                      id="startAyah"
                      value={startAyah}
                      onChange={(e) => setStartAyah(Number(e.target.value))}
                      min={1}
                      max={maxAyah}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="endAyah"
                      className="block text-sm font-medium text-gray-700"
                    >
                      End Ayah
                    </label>
                    <input
                      type="number"
                      id="endAyah"
                      value={endAyah}
                      onChange={(e) => setEndAyah(Number(e.target.value))}
                      min={startAyah}
                      max={maxAyah}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Due date + time */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="dueDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      value={dueDate}
                      min={getTomorrowDatePST()}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dueTime"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Due Time <span className="text-gray-400 font-normal">(Pacific)</span>
                    </label>
                    <div className="mt-1">
                      <TimePicker
                        value={dueTime}
                        onChange={setDueTime}
                        placeholder="Select time"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Student selection */}
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
