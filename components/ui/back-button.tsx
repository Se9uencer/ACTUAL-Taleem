"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "./button"

interface BackButtonProps {
  href?: string
  label?: string
  variant?: "ghost" | "outline" | "default"
  className?: string
}

export function BackButton({ 
  href, 
  label = "Back", 
  variant = "ghost", 
  className = "" 
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleBack}
      className={`text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
} 