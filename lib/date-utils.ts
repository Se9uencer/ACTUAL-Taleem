/**
 * Formats a date string to display in Pacific Time (Los Angeles)
 */
export function formatDatePST(dateString: string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(dateString)

  // Default options for date formatting
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }

  return new Date(date).toLocaleString("en-US", defaultOptions)
}

/**
 * Formats a date string to display in Pacific Time (Los Angeles) with time
 */
export function formatDateTimePST(dateString: string): string {
  return formatDatePST(dateString, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Checks if a date is in the past (in Pacific Time)
 */
export function isPastDuePST(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()

  // Convert both dates to PST for comparison
  const datePST = new Date(date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))
  const nowPST = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))

  return datePST < nowPST
}

/**
 * Gets the current date in PST as an ISO string
 */
export function getCurrentDatePST(): string {
  const now = new Date()
  const nowPST = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))
  return nowPST.toISOString().split("T")[0]
}

/**
 * Gets tomorrow's date in PST as an ISO string
 */
export function getTomorrowDatePST(): string {
  const now = new Date()
  const nowPST = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }))
  nowPST.setDate(nowPST.getDate() + 1)
  return nowPST.toISOString().split("T")[0]
}

/**
 * Extracts the Pacific wall-clock date (YYYY-MM-DD) and 24-hour time (HH:MM)
 * from a stored ISO timestamp.  Uses Intl so it is correct regardless of the
 * server/browser's own timezone — critical for the edit form pre-fill.
 */
export function parsePacificDateTime(isoString: string): {
  date: string
  time: string
} {
  const d = new Date(isoString)
  // en-CA gives reliable YYYY-MM-DD; en-GB + hour12:false gives HH:MM
  const date = d.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  })
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return { date, time }
}

/**
 * Converts a Pacific wall-clock date+time into a full ISO 8601 string with
 * the correct America/Los_Angeles UTC offset (accounts for PDT/PST switch).
 *
 * The old approach used `getTimezoneOffset()` which returns the *browser's*
 * local offset and is wrong for any teacher outside the Pacific timezone.
 * Here we ask Intl directly what offset LA uses around that date so the result
 * is correct regardless of where the user's browser is.
 *
 * @param dateStr  YYYY-MM-DD (as entered in a <input type="date">)
 * @param timeStr  HH:MM      (24-hour, as entered in a time picker)
 */
export function pacificWallClockToISO(dateStr: string, timeStr: string): string {
  // Use the wall-clock values as a UTC probe — close enough for DST lookups
  // since the Pacific offset only changes by 1 hour and DST transitions are
  // anchored to Pacific wall-clock time (2 AM), not a specific UTC instant.
  const probe = new Date(`${dateStr}T${timeStr}:00Z`)

  const tzName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT-8"

  // tzName is "GMT-7" (PDT) or "GMT-8" (PST)
  const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!m) return `${dateStr}T${timeStr}:00-08:00`

  const sign = m[1] === "+" ? "+" : "-"
  const h = m[2].padStart(2, "0")
  const min = (m[3] ?? "00").padStart(2, "0")
  return `${dateStr}T${timeStr}:00${sign}${h}:${min}`
}
