"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { BackButton } from "@/components/ui/back-button"
import { Save } from "lucide-react"
import { surahData, getAyahCount, generateAssignmentTitle } from "@/lib/quran-data"
import { pacificWallClockToISO } from "@/lib/date-utils"
import { TimePicker } from "@/components/ui/time-picker"
import { StudentSelector } from "@/components/ui/student-selector"
import { createClient } from "@/lib/supabase/client"

interface EditAssignmentFormProps {
  assignmentId: string
  classId: string
  initialSurahName: string
  initialStartAyah: number
  initialEndAyah: number
  initialDate: string
  initialTime: string
  initialStudentIds: string[]
  initialAssignToAll: boolean
}

/** Snapshot all active students in a class for "assign to all" re-saves. */
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
  return data?.map((r) => r.student_id) ?? []
}

export function EditAssignmentForm({
  assignmentId,
  classId,
  initialSurahName,
  initialStartAyah,
  initialEndAyah,
  initialDate,
  initialTime,
  initialStudentIds,
  initialAssignToAll,
}: EditAssignmentFormProps) {
  const router = useRouter()

  const [surahName, setSurahName] = useState(initialSurahName)
  const [startAyah, setStartAyah] = useState(initialStartAyah)
  const [endAyah, setEndAyah] = useState(initialEndAyah)
  const [maxAyah, setMaxAyah] = useState(() => getAyahCount(initialSurahName))
  const [dueDate, setDueDate] = useState(initialDate)
  const [dueTime, setDueTime] = useState(initialTime)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialStudentIds)
  const [assignToAll, setAssignToAll] = useState(initialAssignToAll)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep max ayah in sync when surah changes
  useEffect(() => {
    setMaxAyah(getAyahCount(surahName))
  }, [surahName])

  const handleStudentSelectionChange = (studentIds: string[], toAll: boolean) => {
    setSelectedStudentIds(studentIds)
    setAssignToAll(toAll)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      // Convert Pacific wall-clock → correct ISO offset (fixes the getTimezoneOffset bug)
      const dueDateTime = pacificWallClockToISO(dueDate, dueTime)

      const { error: updateError } = await supabase
        .from("assignments")
        .update({ title, surah_name: surahName, start_ayah: startAyah, end_ayah: endAyah, due_date: dueDateTime })
        .eq("id", assignmentId)

      if (updateError) throw updateError

      // Replace the student list (delete-then-insert to handle additions/removals)
      const { error: deleteError } = await supabase
        .from("assignment_students")
        .delete()
        .eq("assignment_id", assignmentId)

      if (deleteError) throw new Error("Failed to update student assignments")

      const studentsToAssign = assignToAll
        ? await getAllClassStudents(classId)
        : selectedStudentIds

      if (studentsToAssign.length === 0) {
        throw new Error("No students available to assign")
      }

      const { error: insertError } = await supabase
        .from("assignment_students")
        .insert(
          studentsToAssign.map((studentId) => ({
            assignment_id: assignmentId,
            student_id: studentId,
          }))
        )

      if (insertError) throw new Error("Failed to assign students to assignment")

      router.push(`/assignments/${assignmentId}?message=Assignment updated successfully!`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton
              href={`/assignments/${assignmentId}`}
              label="Back to Assignment"
              className="mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Surah */}
                <div>
                  <label htmlFor="surah" className="block text-sm font-medium text-gray-700">
                    Surah
                  </label>
                  <select
                    id="surah"
                    value={surahName}
                    onChange={(e) => setSurahName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    {surahData.map((s) => (
                      <option key={s.number} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ayah range */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="startAyah" className="block text-sm font-medium text-gray-700">
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
                    <label htmlFor="endAyah" className="block text-sm font-medium text-gray-700">
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
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700">
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
