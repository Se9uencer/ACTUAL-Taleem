"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@/lib/supabase/client"
import { TaleemLogo } from "@/components/taleem-logo"
import { surahData, getAyahCount, generateAssignmentTitle } from "@/lib/quran-data"
import { ArrowLeft, Save } from "lucide-react"
import { TimePicker } from "@/components/ui/time-picker"

export default function EditAssignmentPage() {
  const [surahName, setSurahName] = useState("")
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(1)
  const [maxAyah, setMaxAyah] = useState(7)
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          router.push("/login");
          return
        }
        
        const { data } = await supabase.from("assignments").select("*").eq("id", assignmentId).single()
        if (!data) {
            throw new Error("Assignment not found or you don't have permission to edit it.");
        }
        if (data.teacher_id !== sessionData.session.user.id) {
          throw new Error("You don't have permission to edit this assignment")
        }

        setSurahName(data.surah_name as string)
        setStartAyah(data.start_ayah as number)
        setEndAyah(data.end_ayah as number)
        
        // Parse the due_date properly to extract date and time in local timezone
        if (data.due_date) {
          const dueDateTime = new Date(data.due_date as string)
          
          // Extract date in YYYY-MM-DD format
          const year = dueDateTime.getFullYear()
          const month = String(dueDateTime.getMonth() + 1).padStart(2, '0')
          const day = String(dueDateTime.getDate()).padStart(2, '0')
          setDueDate(`${year}-${month}-${day}`)
          
          // Extract time in HH:mm format (24-hour)
          const hours = String(dueDateTime.getHours()).padStart(2, '0')
          const minutes = String(dueDateTime.getMinutes()).padStart(2, '0')
          setDueTime(`${hours}:${minutes}`)
        }

      } catch (err: any) {
          setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (assignmentId) {
      loadAssignment()
    }
  }, [assignmentId, router])

  useEffect(() => {
    if (surahName) setMaxAyah(getAyahCount(surahName))
  }, [surahName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dueTime) {
        setError("Please select a due time.")
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

      const { error } = await supabase
        .from("assignments")
        .update({
          title,
          surah_name: surahName,
          start_ayah: startAyah,
          end_ayah: endAyah,
          due_date: dueDateTime,
        })
        .eq("id", assignmentId)

      if (error) throw error

      router.push(`/assignments/${assignmentId}?message=Assignment updated successfully!`)
    } catch (err: any) {
        setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <TaleemLogo className="h-12 w-auto text-purple-600 mb-4" />
        <p className="text-gray-700 mb-2">Loading assignment...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
                <Link href={`/assignments/${assignmentId}`} className="text-gray-500 hover:text-gray-700 mr-4">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
            </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md"><p>{error}</p></div>}
            
            <div className="space-y-4">
               <div>
                <label htmlFor="surah" className="block text-sm font-medium text-gray-700">Surah</label>
                <select id="surah" value={surahName} onChange={(e) => setSurahName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
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
                  <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                  <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700">Due Time</label>
                  <div className="mt-1">
                    <TimePicker value={dueTime} onChange={setDueTime} placeholder="Select time" className="h-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={submitting || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50">
                <Save className="mr-2 h-4 w-4" />
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 