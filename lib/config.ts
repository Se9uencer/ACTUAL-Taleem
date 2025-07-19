// This file centralizes all configuration values and provides fallbacks

// Arabic text processing configuration
export const arabicConfig = {
  // Whether to use harakat (diacritics) when matching Arabic text
  // Set to false to normalize both transcription and Quranic text by removing harakat
  // This helps match Whisper output (no harakat) with Quranic text (with harakat)
  USE_HARAKAT_MATCHING: process.env.USE_HARAKAT_MATCHING === "true" || false,
}

// Supabase configuration
export const supabaseConfig = {
  // Use environment variables for all Supabase configuration
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // Helper function to check if the configuration is valid
  isValid: function () {
    return (
      this.url &&
      this.anonKey &&
      this.url.includes("supabase.co") &&
      this.anonKey.length > 10 &&
      !this.url.includes("your-project-ref") &&
      !this.anonKey.includes("your-anon-key")
    )
  },
}

// Log configuration status during development
if (process.env.NODE_ENV === "development") {
  console.log("Supabase config status:", {
    url: supabaseConfig.url ? "defined" : "undefined",
    anonKey: supabaseConfig.anonKey ? "defined" : "undefined",
    isValid: supabaseConfig.isValid(),
  })
}
