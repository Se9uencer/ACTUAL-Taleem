"use client"

import { useState, useEffect, useMemo } from "react"
import { Clock, ChevronDown } from "lucide-react"

interface TimePickerProps {
  value: string // Expects "HH:mm" (24-hour format)
  onChange: (time: string) => void // Returns "HH:mm" (24-hour format)
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function TimePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "Select time",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { hour: initialHour, minute: initialMinute, period: initialPeriod } = useMemo(() => {
    if (!value || !value.includes(":")) {
      return { hour: null, minute: null, period: null }
    }
    const [h, m] = value.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour12 = h % 12 || 12
    return { hour: hour12, minute: m, period: period as "AM" | "PM" }
  }, [value])

  const [selectedHour, setSelectedHour] = useState<number | null>(initialHour)
  const [selectedMinute, setSelectedMinute] = useState<number | null>(initialMinute)
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM" | null>(initialPeriod)
  
  useEffect(() => {
    if (value && value.includes(":")) {
        const [h, m] = value.split(":").map(Number)
        const newPeriod = h >= 12 ? "PM" : "AM"
        const newHour12 = h % 12 || 12
        setSelectedHour(newHour12)
        setSelectedMinute(m)
        setSelectedPeriod(newPeriod)
    } else {
        setSelectedHour(null)
        setSelectedMinute(null)
        setSelectedPeriod(null)
    }
  }, [value])

  const handleTimeChange = (
    h: number | null,
    m: number | null,
    p: "AM" | "PM" | null
  ) => {
    setSelectedHour(h)
    setSelectedMinute(m)
    setSelectedPeriod(p)

    if (h !== null && m !== null && p !== null) {
      let hours24 = h
      if (p === "PM" && h !== 12) {
        hours24 += 12
      }
      if (p === "AM" && h === 12) {
        hours24 = 0
      }
      const timeString = `${String(hours24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      console.log('=== TIMEPICKER DEBUG ===')
      console.log('TimePicker onChange called with hour:', h, 'minute:', m, 'period:', p)
      console.log('Converted to 24-hour:', hours24)
      console.log('Final timeString:', timeString)
      console.log('=== END TIMEPICKER DEBUG ===')
      onChange(timeString)
    } else {
        onChange("")
    }
  }

  const displayTime = useMemo(() => {
    if (selectedHour !== null && selectedMinute !== null && selectedPeriod) {
      return `${selectedHour}:${String(selectedMinute).padStart(2, "0")} ${selectedPeriod}`
    }
    return placeholder
  }, [selectedHour, selectedMinute, selectedPeriod, placeholder])

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center justify-between ${className}`}
      >
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <span className={value ? "text-gray-900" : "text-gray-500"}>{displayTime}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2">
            <div className="grid grid-cols-3 gap-1">
              {/* Hours */}
              <div className="max-h-48 overflow-y-auto">
                {hours.map((h) => (
                  <button key={h} type="button" onClick={() => handleTimeChange(h, selectedMinute ?? 0, selectedPeriod ?? 'PM')}
                    className={`w-full px-2 py-1 text-sm rounded text-center ${selectedHour === h ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                  >{h}</button>
                ))}
              </div>

              {/* Minutes */}
              <div className="max-h-48 overflow-y-auto">
                {minutes.map((m) => (
                  <button key={m} type="button" onClick={() => handleTimeChange(selectedHour ?? 12, m, selectedPeriod ?? 'PM')}
                    className={`w-full px-2 py-1 text-sm rounded text-center ${selectedMinute === m ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                  >{String(m).padStart(2, "0")}</button>
                ))}
              </div>

              {/* AM/PM */}
              <div className="space-y-1">
                {(["AM", "PM"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => handleTimeChange(selectedHour ?? 12, selectedMinute ?? 0, p)}
                    className={`w-full px-2 py-1 text-sm rounded text-center ${selectedPeriod === p ? "bg-purple-100 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                  >{p}</button>
                ))}
              </div>
            </div>
            
            {/* Quick presets */}
            <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-1">
                    <button type="button" onClick={() => { handleTimeChange(9, 0, 'AM'); setIsOpen(false); }} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">9:00 AM</button>
                    <button type="button" onClick={() => { handleTimeChange(12, 0, 'PM'); setIsOpen(false); }} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">12:00 PM</button>
                    <button type="button" onClick={() => { handleTimeChange(5, 0, 'PM'); setIsOpen(false); }} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">5:00 PM</button>
                </div>
            </div>

          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
    </div>
  )
} 