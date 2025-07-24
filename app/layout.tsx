import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SettingsProvider } from "@/contexts/settings-context"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "sonner"
import { ThemeScript } from "./theme-script"

export const metadata: Metadata = {
  title: "Taleem - Islamic Learning Platform",
  description: "A modern Islamic learning platform for students, teachers, and parents",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
        <Toaster />
        <Sonner />
      </body>
    </html>
  )
}
