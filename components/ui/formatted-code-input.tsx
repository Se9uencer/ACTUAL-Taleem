"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FormattedCodeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  format?: "class-code" | "student-id" | "class-code-nodash" | "student-id-nodash"
  id?: string
  maxLength?: number
}

export function FormattedCodeInput({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  className = "",
  format = "class-code",
  id,
  maxLength
}: FormattedCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  // Define formatting patterns
  const patterns = {
    "class-code": {
      format: [3, 3, 3], // XXX-XXX-XXX
      separator: "-",
      maxLength: 11, // Including dashes
      rawMaxLength: 9
    },
    "class-code-nodash": {
      format: [9], // Just 9 chars, no dashes
      separator: "",
      maxLength: 9,
      rawMaxLength: 9
    },
    "student-id": {
      format: [3, 2, 3], // XXX-XX-XXX  
      separator: "-",
      maxLength: 10, // Including dashes
      rawMaxLength: 8
    },
    "student-id-nodash": {
      format: [8], // Just 8 chars, no dashes
      separator: "",
      maxLength: 8,
      rawMaxLength: 8
    }
  }

  const pattern = patterns[format]
  const effectiveMaxLength = maxLength || pattern.maxLength

  // Clean input (remove non-alphanumeric)
  const cleanInput = (input: string): string => {
    return input.replace(/[^A-Z0-9]/g, "").slice(0, pattern.rawMaxLength)
  }

  // Format input with dashes (or not)
  const formatInput = (input: string): string => {
    const cleaned = cleanInput(input)
    if (format === "class-code-nodash" || format === "student-id-nodash") {
      return cleaned
    }
    let formatted = ""
    let position = 0
    for (let i = 0; i < pattern.format.length; i++) {
      const segmentLength = pattern.format[i]
      const segment = cleaned.slice(position, position + segmentLength)
      if (segment.length > 0) {
        formatted += segment
        if (i < pattern.format.length - 1 && segment.length === segmentLength) {
          formatted += pattern.separator
        }
      }
      position += segmentLength
    }
    return formatted
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase()
    const currentCursor = e.target.selectionStart || 0
    const formatted = formatInput(newValue)
    const cleanValue = cleanInput(newValue)
    let newCursorPosition = currentCursor
    // If we added a dash, move cursor forward (not needed for nodash)
    if (format !== "class-code-nodash" && format !== "student-id-nodash") {
      if (formatted.length > value.length && formatted[currentCursor - 1] === pattern.separator) {
        newCursorPosition = currentCursor
      } else if (formatted[currentCursor - 1] === pattern.separator && newValue.length > value.length) {
        newCursorPosition = currentCursor + 1
      }
    }
    setCursorPosition(newCursorPosition)
    onChange(cleanValue) // Pass clean value to parent
  }

  // Handle keydown for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentCursor = inputRef.current?.selectionStart || 0
    // Handle backspace at dash positions (not needed for nodash)
    if (format !== "class-code-nodash" && format !== "student-id-nodash") {
      if (e.key === "Backspace" && currentCursor > 0) {
        const formatted = formatInput(value)
        if (formatted[currentCursor - 1] === pattern.separator) {
          e.preventDefault()
          const newValue = value.slice(0, -1)
          onChange(newValue)
          setCursorPosition(currentCursor - 1)
        }
      }
    }
  }

  // Update cursor position after state changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [cursorPosition, value])

  // Format the display value
  const displayValue = formatInput(value)

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={effectiveMaxLength}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono tracking-wider",
        className
      )}
    />
  )
} 