import { useState } from "react"
import { createClientComponentClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

interface UseAssignmentDeletionReturn {
  deleteAssignment: (assignmentId: string) => Promise<boolean>
  isDeleting: boolean
}

export function useAssignmentDeletion(): UseAssignmentDeletionReturn {
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    setIsDeleting(true)
    
    try {
      const supabase = createClientComponentClient()
      
      // Delete the assignment
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId)

      if (error) {
        console.error("Error deleting assignment:", error)
        toast({
          title: "Error",
          description: `Failed to delete assignment: ${error.message}`,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      })
      
      return true
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      toast({
        title: "Error",
        description: `Failed to delete assignment: ${error.message}`,
        variant: "destructive",
      })
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteAssignment,
    isDeleting,
  }
} 