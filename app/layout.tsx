import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SettingsProvider } from "@/contexts/settings-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider>{children}</SettingsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
